import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AdminService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Workspace'teki yönetici sayısı — rol karşılaştırması BÜYÜK/küçük harf
   * duyarsız ('Admin' / 'admin' / 'OWNER' hepsi sayılır) ve `workspaces.owner_id`
   * sahibi, workspace_members satırı olmasa bile dahil edilir. Önceki
   * `.eq('role', 'Admin')` sayımı bu iki durumu kaçırıp "tek yönetici" korumasını
   * yanlış tetikliyordu.
   */
  private async countWorkspaceAdmins(workspaceId: string): Promise<number> {
    const client = this.supabaseService.getClient();

    const [{ data: members }, { data: workspace }] = await Promise.all([
      client
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId),
      client
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .maybeSingle(),
    ]);

    const adminIds = new Set<string>();
    for (const row of members ?? []) {
      const role = String(row.role ?? '').toLowerCase();
      if ((role === 'admin' || role === 'owner') && row.user_id) {
        adminIds.add(String(row.user_id));
      }
    }
    if (workspace?.owner_id) adminIds.add(String(workspace.owner_id));

    return adminIds.size;
  }

  /**
   * Workspace özet istatistikleri: toplam üye, aktif görev ve proje sayısı.
   */
  async getStats(workspaceId: string) {
    const client = this.supabaseService.getClient();

    const [membersResult, tasksResult, projectsResult] = await Promise.all([
      client
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId),
      client
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .neq('status', 'DONE'),
      client
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null),
    ]);

    if (membersResult.error) {
      throw new BadRequestException(membersResult.error.message);
    }
    if (tasksResult.error) {
      throw new BadRequestException(tasksResult.error.message);
    }
    if (projectsResult.error) {
      throw new BadRequestException(projectsResult.error.message);
    }

    return {
      totalUsers: membersResult.count ?? 0,
      activeTasks: tasksResult.count ?? 0,
      totalProjects: projectsResult.count ?? 0,
    };
  }

  /**
   * Kullanıcıyı workspace üyeliklerinden kaldırır.
   * Kendini silme ve son Admin korumaları uygulanır.
   */
  async removeUser(
    workspaceId: string,
    targetUserId: string,
    actorUserId: string,
  ) {
    if (actorUserId === targetUserId) {
      throw new BadRequestException(
        'Kendinizi workspace\'ten çıkaramazsınız',
      );
    }

    const client = this.supabaseService.getClient();

    const { data: targetMember, error: targetError } = await client
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (targetError) {
      throw new BadRequestException(targetError.message);
    }

    if (!targetMember) {
      throw new NotFoundException('Kullanıcı bu çalışma alanında bulunamadı.');
    }

    const targetRoleLower = String(targetMember.role ?? '').toLowerCase();
    if (targetRoleLower === 'admin' || targetRoleLower === 'owner') {
      const adminCount = await this.countWorkspaceAdmins(workspaceId);
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Workspace\'in tek yöneticisi silinemez. Önce yetki devri yapın',
        );
      }
    }

    const { data, error } = await client
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Kullanıcı bu çalışma alanında bulunamadı.');
    }

    return {
      message: 'Kullanıcı çalışma alanından başarıyla kaldırıldı.',
      userId: targetUserId,
      workspaceId,
    };
  }

  /**
   * Üye rolünü Admin ↔ Member olarak günceller.
   * OWNER satırına dokunulmaz; kendini düşürme / son admin koruması var.
   */
  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    role: 'Admin' | 'Member',
    actorUserId: string,
  ) {
    if (actorUserId === targetUserId && role === 'Member') {
      throw new BadRequestException(
        'Kendi Admin yetkinizi bu ekrandan düşüremezsiniz.',
      );
    }

    const client = this.supabaseService.getClient();

    const { data: targetMember, error: targetError } = await client
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (targetError) {
      throw new BadRequestException(targetError.message);
    }
    if (!targetMember) {
      throw new NotFoundException('Kullanıcı bu çalışma alanında bulunamadı.');
    }

    const currentRole = String(targetMember.role ?? '');
    if (currentRole.toUpperCase() === 'OWNER') {
      throw new BadRequestException('Workspace sahibinin rolü değiştirilemez.');
    }

    if (currentRole.toUpperCase() === 'ADMIN' && role === 'Member') {
      const adminCount = await this.countWorkspaceAdmins(workspaceId);
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Workspace\'in tek yöneticisinin rolü düşürülemez.',
        );
      }
    }

    const { data, error } = await client
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .select('user_id, role')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Kullanıcı bu çalışma alanında bulunamadı.');
    }

    return {
      message: 'Üye rolü güncellendi.',
      userId: targetUserId,
      workspaceId,
      role: data.role,
    };
  }
}
