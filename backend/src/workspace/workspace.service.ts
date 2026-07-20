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

    const { error: memberError } = await client
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'Admin',
      });

    if (memberError) {
      const msg = memberError.message?.toLowerCase() ?? '';
      const alreadyMember =
        msg.includes('duplicate') ||
        msg.includes('unique') ||
        memberError.code === '23505';
      if (!alreadyMember) {
        throw new BadRequestException(memberError.message);
      }
    }

    return { ...workspace, role: 'Admin' };
  }

  async findAll(userId: string, accessToken: string) {
    if (!accessToken?.trim()) {
      throw new UnauthorizedException('Bearer token gerekli.');
    }

    const client = this.supabaseService.createUserClient(accessToken);

    const { data, error } = await client
      .from('workspace_members')
      .select(
        'role, workspaces(id, name, description, owner_id, created_at, updated_at)',
      )
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []).map((member: any) => {
      const ws = Array.isArray(member.workspaces)
        ? member.workspaces[0]
        : member.workspaces;
      return {
        ...(ws ?? {}),
        role: member.role,
      };
    });
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
