import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { RespondClaimDto } from './dto/respond-claim.dto';
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
  @ApiResponse({
    status: 200,
    description: 'Tüm bildirimler okundu işaretlendi.',
  })
  @ApiResponse({ status: 403, description: 'Workspace üyesi değilsiniz.' })
  markAllAsRead(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: { id: string },
  ) {
    return this.notificationService.markAllAsRead(workspaceId, user.id);
  }

  @Post(':id/respond-claim')
  @ApiOperation({
    summary: 'Görev sahiplenme (claim) bildirimini kabul veya reddeder',
  })
  @ApiResponse({ status: 200, description: 'Sahiplenme yanıtı işlendi.' })
  @ApiResponse({
    status: 403,
    description: 'Yalnızca atanan kullanıcı yanıtlayabilir.',
  })
  respondClaim(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @GetUser() user: { id: string },
    @Body() dto: RespondClaimDto,
  ) {
    return this.notificationService.respondToClaim(
      workspaceId,
      id,
      user.id,
      dto.decision,
    );
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
