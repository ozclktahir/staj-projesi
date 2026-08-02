import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { IsIn, IsString } from 'class-validator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';
import { AdminService } from './admin.service';

class UpdateMemberRoleDto {
  @IsString()
  @IsIn(['Admin', 'Member'])
  role: 'Admin' | 'Member';
}

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('Admin', 'OWNER')
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({
    summary:
      'Workspace istatistiklerini getirir (toplam kullanıcı, aktif görev, proje)',
  })
  @ApiResponse({
    status: 200,
    description: 'İstatistikler başarıyla getirildi.',
  })
  @ApiResponse({
    status: 403,
    description: 'Bu işlem için Admin rolüne sahip olmanız gerekir.',
  })
  getStats(@Param('workspaceId') workspaceId: string) {
    return this.adminService.getStats(workspaceId);
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Workspace üyesinin rolünü günceller' })
  @ApiResponse({ status: 200, description: 'Rol güncellendi.' })
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @GetUser() actor: { id: string },
  ) {
    if (!dto?.role) {
      throw new BadRequestException('role zorunludur (Admin | Member).');
    }
    return this.adminService.updateMemberRole(
      workspaceId,
      userId,
      dto.role,
      actor.id,
    );
  }

  @Delete('users/:userId/remove')
  @ApiOperation({ summary: 'Bir kullanıcıyı workspace üyeliğinden kaldırır' })
  @ApiResponse({
    status: 200,
    description: 'Kullanıcı çalışma alanından kaldırıldı.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Kendini silme veya son Admin koruması nedeniyle işlem reddedildi.',
  })
  @ApiResponse({
    status: 403,
    description: 'Bu işlem için Admin rolüne sahip olmanız gerekir.',
  })
  @ApiResponse({
    status: 404,
    description: 'Kullanıcı bu çalışma alanında bulunamadı.',
  })
  removeUser(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @GetUser() actor: { id: string },
  ) {
    return this.adminService.removeUser(workspaceId, userId, actor.id);
  }
}
