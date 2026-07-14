import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';
import { ActivityLogService } from './activity-log.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Post()
  @Roles('Admin', 'Member')
  @ApiOperation({ summary: 'Çalışma alanına manuel bir aktivite kaydı ekler' })
  @ApiResponse({ status: 201, description: 'Aktivite kaydı başarıyla oluşturuldu.' })
  @ApiResponse({
    status: 403,
    description: 'Aktivite kaydı eklemek için Admin veya Member rolüne sahip olmanız gerekir.',
  })
  create(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: any,
    @Body() dto: CreateActivityLogDto,
  ) {
    return this.activityLogService.logAction(workspaceId, user.id, dto);
  }

  @Get()
  @Roles('Admin', 'Member')
  @ApiOperation({ summary: 'Çalışma alanına ait tüm aktivite kayıtlarını listeler' })
  @ApiResponse({ status: 200, description: 'Aktivite kayıtları listelendi.' })
  @ApiResponse({
    status: 403,
    description: 'Aktivite kayıtlarını görmek için Admin veya Member rolüne sahip olmanız gerekir.',
  })
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.activityLogService.findAllByWorkspace(workspaceId);
  }
}
