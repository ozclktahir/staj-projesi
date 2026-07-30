import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [SupabaseModule],
  controllers: [WorkspaceController, WorkspaceMembersController],
  providers: [WorkspaceService],
})
export class WorkspaceModule {}
