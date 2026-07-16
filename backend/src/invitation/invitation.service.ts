import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class InvitationService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Daveti kabul eder: kullanıcıyı workspace_members'a Member olarak ekler
   * ve davet durumunu ACCEPTED yapar.
   */
  async accept(invitationId: string, user: { id: string; email?: string }) {
    const client = this.supabaseService.getClient();

    const { data: invitation, error: invitationError } = await client
      .from('workspace_invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle();

    if (invitationError) {
      throw new BadRequestException(invitationError.message);
    }

    if (!invitation) {
      throw new NotFoundException('Davet bulunamadı.');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException('Bu davet zaten kabul edilmiş.');
    }

    const userEmail = user.email?.toLowerCase()?.trim();
    const invitationEmail = String(invitation.email ?? '')
      .toLowerCase()
      .trim();

    if (!userEmail || userEmail !== invitationEmail) {
      throw new ForbiddenException(
        'Bu davet sizin e-posta adresinize ait değil.',
      );
    }

    const { data: existingMember, error: memberLookupError } = await client
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberLookupError) {
      throw new BadRequestException(memberLookupError.message);
    }

    if (!existingMember) {
      const { error: memberInsertError } = await client
        .from('workspace_members')
        .insert({
          workspace_id: invitation.workspace_id,
          user_id: user.id,
          role: 'Member',
        });

      if (memberInsertError) {
        throw new BadRequestException(memberInsertError.message);
      }
    }

    const { data: updatedInvitation, error: updateError } = await client
      .from('workspace_invitations')
      .update({ status: 'ACCEPTED' })
      .eq('id', invitationId)
      .select()
      .single();

    if (updateError) {
      throw new BadRequestException(updateError.message);
    }

    return {
      message: 'Davet başarıyla kabul edildi.',
      invitation: updatedInvitation,
      membership: {
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: 'Member',
      },
    };
  }
}
