import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';
import { WorkspaceService } from './workspace.service';

@ApiTags('Workspace Members')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/members')
export class WorkspaceMembersController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  @ApiOperation({
    summary:
      'Çalışma alanı üyelerini listeler (Admin: tümü, Member: yalnızca kendisi)',
  })
  @ApiResponse({ status: 200, description: 'Üyeler listelendi.' })
  @ApiResponse({ status: 403, description: 'Workspace erişim izni yok.' })
  list(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: { id: string },
  ) {
    return this.workspaceService.listMembers(workspaceId, user.id);
  }
}
