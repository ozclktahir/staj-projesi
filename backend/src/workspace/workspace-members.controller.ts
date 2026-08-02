import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';
import { WorkspaceService } from './workspace.service';

function extractBearerToken(request: Request): string {
  const raw = request.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || typeof header !== 'string') return '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

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
    @Req() request: Request,
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: { id: string },
  ) {
    return this.workspaceService.listMembers(
      workspaceId,
      user.id,
      extractBearerToken(request),
    );
  }
}
