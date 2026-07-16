import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('statistics')
  @ApiOperation({
    summary:
      'Çalışma alanına ait istatistikleri getirir (tamamlanan/geciken görevler vb.)',
  })
  @ApiResponse({ status: 200, description: 'İstatistikler başarıyla getirildi.' })
  getWorkspaceStatistics(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getWorkspaceStats(workspaceId);
  }
}
