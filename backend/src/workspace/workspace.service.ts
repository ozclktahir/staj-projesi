import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class WorkspaceService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const client = this.supabaseService.getClient();

    const { data: workspace, error: workspaceError } = await client
      .from('workspaces')
      .insert({ name: dto.name, description: dto.description ?? null })
      .select()
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
      throw new BadRequestException(memberError.message);
    }

    return workspace;
  }

  async findAll(userId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('workspace_members')
      .select('role, workspaces(*)')
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []).map((member: any) => ({
      ...member.workspaces,
      role: member.role,
    }));
  }

  async invite(workspaceId: string, inviterId: string, dto: InviteMemberDto) {
    const client = this.supabaseService.getClient();

    const { data: membership, error: membershipError } = await client
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', inviterId)
      .maybeSingle();

    if (membershipError) {
      throw new BadRequestException(membershipError.message);
    }

    if (!membership || membership.role !== 'Admin') {
      throw new ForbiddenException(
        'Bu çalışma alanına davet gönderebilmek için Admin rolüne sahip olmanız gerekiyor.',
      );
    }

    const { data: invitation, error: invitationError } = await client
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        email: dto.email,
        role: dto.role,
        invited_by: inviterId,
      })
      .select()
      .single();

    if (invitationError) {
      throw new BadRequestException(invitationError.message);
    }

    return invitation;
  }
}
