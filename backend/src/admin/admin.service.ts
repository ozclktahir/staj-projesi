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
   */
  async removeUser(workspaceId: string, userId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
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
      userId,
      workspaceId,
    };
  }
}
