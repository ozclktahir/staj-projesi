import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
  // get_workspace_statistics RPC'si kullanıcıya göre değil, tüm workspace
  // için tek bir sonuç üretiyor (bkz. dashboard.service.ts) — bu yüzden
  // workspaceId başına 30sn cache güvenli (ProjectController.findAll'daki
  // 60sn'lik projects cache'iyle aynı desen, biraz daha kısa TTL: dashboard
  // sayıları daha "canlı" hissettirmeli).
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @ApiOperation({
    summary:
      'Çalışma alanına ait istatistikleri getirir (tamamlanan/geciken görevler vb.)',
  })
  @ApiResponse({ status: 200, description: 'İstatistikler başarıyla getirildi.' })
  getWorkspaceStatistics(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getWorkspaceStats(workspaceId);
  }
}
