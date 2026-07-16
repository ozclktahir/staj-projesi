import {
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary:
      'Giriş yapmış kullanıcının workspace bildirimlerini listeler (en yeniden eskiye)',
  })
  @ApiResponse({ status: 200, description: 'Bildirimler listelendi.' })
  @ApiResponse({ status: 403, description: 'Workspace üyesi değilsiniz.' })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: { id: string },
  ) {
    return this.notificationService.findAllForUser(workspaceId, user.id);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Workspace içindeki tüm bildirimleri okundu olarak işaretler',
  })
  @ApiResponse({ status: 200, description: 'Tüm bildirimler okundu işaretlendi.' })
  @ApiResponse({ status: 403, description: 'Workspace üyesi değilsiniz.' })
  markAllAsRead(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: { id: string },
  ) {
    return this.notificationService.markAllAsRead(workspaceId, user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Belirli bir bildirimi okundu olarak işaretler' })
  @ApiResponse({ status: 200, description: 'Bildirim okundu olarak işaretlendi.' })
  @ApiResponse({ status: 404, description: 'Bildirim bulunamadı.' })
  markAsRead(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @GetUser() user: { id: string },
  ) {
    return this.notificationService.markAsRead(workspaceId, id, user.id);
  }
}
