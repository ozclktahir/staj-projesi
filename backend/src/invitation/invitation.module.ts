import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { InvitationsController } from './invitation.controller';
import { InvitationService } from './invitation.service';

@Module({
  imports: [SupabaseModule],
  controllers: [InvitationsController],
  providers: [InvitationService],
})
export class InvitationModule {}
