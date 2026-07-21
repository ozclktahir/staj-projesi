import {
  BadRequestException,
  Injectable,
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

  async invite(workspaceId: string, inviterId: string, dto: InviteMemberDto) {
    const client = this.supabaseService.getClient();

    const { data: invitation, error: invitationError } = await client
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        email: dto.email,
        role: dto.role,
        invited_by: inviterId,
        status: 'PENDING',
      })
      .select()
      .single();

    if (invitationError) {
      throw new BadRequestException(invitationError.message);
    }

    return invitation;
  }
}
