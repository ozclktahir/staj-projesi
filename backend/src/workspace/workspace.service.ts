import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class WorkspaceService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * RLS uyumlu create: kullanıcı JWT’si ile istemci + owner_id = auth.uid().
   */
  async create(userId: string, dto: CreateWorkspaceDto, accessToken: string) {
    if (!accessToken?.trim()) {
      throw new UnauthorizedException('Bearer token gerekli.');
    }

    const client = this.supabaseService.createUserClient(accessToken);

    const payload = {
      name: dto.name,
      description: dto.description ?? null,
      owner_id: userId,
    };

    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .insert(payload)
      .select('id, name, description, owner_id, created_at, updated_at')
      .single();

    if (workspaceError) {
      throw new BadRequestException(workspaceError.message);
    }

    // Üyelik kaydı zorunlu (RLS / listeleme)
    let memberRole = 'OWNER';
    let { error: memberError } = await client.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: memberRole,
    });

    if (memberError) {
      const msg = memberError.message?.toLowerCase() ?? '';
      const roleRejected =
        msg.includes('role') ||
        msg.includes('check') ||
        msg.includes('invalid') ||
        msg.includes('enum');

      if (roleRejected) {
        memberRole = 'Admin';
        ({ error: memberError } = await client.from('workspace_members').insert({
          workspace_id: workspace.id,
          user_id: userId,
          role: memberRole,
        }));
      }
    }

    if (memberError) {
      const msg = memberError.message?.toLowerCase() ?? '';
      const alreadyMember =
        msg.includes('duplicate') ||
        msg.includes('unique') ||
        memberError.code === '23505';
      if (!alreadyMember) {
        throw new BadRequestException(memberError.message);
      }
      memberRole = 'Admin';
    }

    return { ...workspace, role: memberRole };
  }

  /**
   * Kullanıcının TÜM workspace'leri.
   * active_workspace_id ile filtrelenmez.
   * owner_id == userId VEYA workspace_members.user_id == userId
   */
  async findAll(userId: string, accessToken: string) {
    if (!accessToken?.trim()) {
      throw new UnauthorizedException('Bearer token gerekli.');
    }

    const client = this.supabaseService.createUserClient(accessToken);

    const { data: owned, error: ownedError } = await client
      .from('workspaces')
      .select('id, name, description, owner_id, created_at, updated_at')
      .eq('owner_id', userId);

    if (ownedError) {
      throw new BadRequestException(ownedError.message);
    }

    const { data: members, error: membersError } = await client
      .from('workspace_members')
      .select(
        'role, workspaces(id, name, description, owner_id, created_at, updated_at)',
      )
      .eq('user_id', userId);

    if (membersError) {
      throw new BadRequestException(membersError.message);
    }

    const byId = new Map<string, Record<string, unknown>>();

    for (const ws of owned ?? []) {
      if (ws?.id) {
        byId.set(ws.id, { ...ws, role: 'OWNER' });
      }
    }

    for (const member of members ?? []) {
      const ws = Array.isArray((member as any).workspaces)
        ? (member as any).workspaces[0]
        : (member as any).workspaces;
      if (!ws?.id) continue;
      const existing = byId.get(ws.id);
      if (existing) {
        byId.set(ws.id, {
          ...existing,
          role: (member as any).role ?? existing.role,
        });
      } else {
        byId.set(ws.id, { ...ws, role: (member as any).role });
      }
    }

    return Array.from(byId.values());
  }

  async invite(
    workspaceId: string,
    inviterId: string,
    dto: InviteMemberDto,
    accessToken: string,
  ) {
    if (!accessToken?.trim()) {
      throw new UnauthorizedException('Bearer token gerekli.');
    }

    // RLS: invitations_insert_admin → invited_by = auth.uid() + admin/owner
    const client = this.supabaseService.createUserClient(accessToken);

    const role = dto.role === 'Admin' ? 'Admin' : 'Member';

    const { data: invitation, error: invitationError } = await client
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        email: dto.email.toLowerCase().trim(),
        role,
        invited_by: inviterId,
        status: 'PENDING',
      })
      .select()
      .single();

    if (invitationError) {
      throw new BadRequestException(invitationError.message);
    }

    // Davetli kayıtlıysa bildirim oluştur (mobil Kabul/Red için)
    const { data: profile } = await client
      .from('profiles')
      .select('id, email')
      .ilike('email', dto.email.trim())
      .maybeSingle();

    if (profile?.id) {
      const { data: workspace } = await client
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .maybeSingle();

      await client.from('notifications').insert({
        workspace_id: workspaceId,
        user_id: profile.id,
        type: 'workspace_invite',
        title: 'Çalışma alanı daveti',
        message: `"${workspace?.name ?? 'Bir çalışma alanı'}" sizi ${role} olarak davet etti.`,
        metadata: {
          invitation_id: invitation.id,
          invite_id: invitation.id,
          workspace_id: workspaceId,
          workspace_name: workspace?.name ?? null,
          role,
        },
        is_read: false,
      });
    }

    return invitation;
  }

  /**
   * OWNER tarafından workspace silinir (üyelikler + davetler temizlenir).
   */
  async remove(workspaceId: string, userId: string) {
    const client = this.supabaseService.getClient();

    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (workspaceError) {
      throw new BadRequestException(workspaceError.message);
    }
    if (!workspace) {
      throw new NotFoundException('Çalışma alanı bulunamadı.');
    }

    const isOwner = workspace.owner_id === userId;
    if (!isOwner) {
      const { data: membership, error: memberError } = await client
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError) {
        throw new BadRequestException(memberError.message);
      }

      const role = String(membership?.role ?? '').toUpperCase();
      if (role !== 'OWNER') {
        throw new ForbiddenException(
          'Çalışma alanını yalnızca OWNER silebilir.',
        );
      }
    }

    await client
      .from('workspace_invitations')
      .delete()
      .eq('workspace_id', workspaceId);

    await client
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId);

    const { error: deleteError } = await client
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (deleteError) {
      throw new BadRequestException(deleteError.message);
    }

    return { message: 'Çalışma alanı silindi.', id: workspaceId };
  }

  /**
   * Workspace üyelerini listeler (profil + rol).
   * Admin/OWNER: tüm üyeler; Member/Guest: yalnızca kendisi (web parity).
   */
  async listMembers(
    workspaceId: string,
    userId: string,
    accessToken: string,
  ) {
    if (!accessToken?.trim()) {
      throw new UnauthorizedException('Bearer token gerekli.');
    }
    const client = this.supabaseService.createUserClient(accessToken);

    const [{ data: workspace }, { data: membership, error: memberError }] =
      await Promise.all([
        client
          .from('workspaces')
          .select('owner_id')
          .eq('id', workspaceId)
          .maybeSingle(),
        client
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

    if (memberError) {
      throw new BadRequestException(memberError.message);
    }

    const role = (membership?.role as string | null) ?? null;
    const isOwner =
      workspace?.owner_id === userId ||
      String(role ?? '')
        .trim()
        .toUpperCase() === 'OWNER';
    const normalized = String(role ?? '')
      .trim()
      .toUpperCase();
    const isAdmin =
      isOwner || normalized === 'ADMIN' || role === 'Admin';

    const { data: rows, error } = await client
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const memberRows = [...(rows ?? [])] as Array<{
      user_id: string;
      role: string | null;
    }>;

    if (isOwner && !memberRows.some((r) => r.user_id === userId)) {
      memberRows.push({ user_id: userId, role: 'OWNER' });
    }

    const userIds = memberRows.map((r) => r.user_id).filter(Boolean);
    let profiles: Array<Record<string, unknown>> = [];

    if (userIds.length > 0) {
      const withNames = await client
        .from('profiles')
        .select('id, email, full_name, avatar_url, first_name, last_name')
        .in('id', userIds);

      if (withNames.error) {
        const fallback = await client
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds);
        if (fallback.error) {
          throw new BadRequestException(fallback.error.message);
        }
        profiles = (fallback.data ?? []) as Array<Record<string, unknown>>;
      } else {
        profiles = (withNames.data ?? []) as Array<Record<string, unknown>>;
      }
    }

    const profileById = new Map(
      profiles.map((p) => [String(p.id), p] as const),
    );

    let members = memberRows.map((row) => {
      const profile = profileById.get(row.user_id) ?? null;
      const email =
        typeof profile?.email === 'string' ? profile.email.trim() : null;
      const first =
        typeof profile?.first_name === 'string'
          ? profile.first_name.trim()
          : '';
      const last =
        typeof profile?.last_name === 'string' ? profile.last_name.trim() : '';
      const combined = `${first} ${last}`.trim();
      const fullName =
        (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
        combined ||
        null;
      const displayName =
        fullName ||
        (email && email.includes('@') ? email.split('@')[0] : email) ||
        row.user_id.slice(0, 8);

      return {
        id: row.user_id,
        displayName,
        email,
        role: row.role,
        fullName,
        avatarUrl:
          typeof profile?.avatar_url === 'string' ? profile.avatar_url : null,
      };
    });

    if (!isAdmin) {
      members = members.filter((m) => m.id === userId);
    }

    members.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'tr', {
        sensitivity: 'base',
      }),
    );

    return { members, isAdmin, isOwner, role };
  }
}
