import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { InvitationService } from './invitation.service';

@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Giriş yapmış kullanıcının bekleyen workspace davetlerini listeler',
  })
  @ApiResponse({ status: 200, description: 'Bekleyen davetler listelendi.' })
  findMine(@GetUser() user: { id: string; email?: string }) {
    return this.invitationService.findPendingForUser(user);
  }

  @Post(':id/accept')
  @ApiOperation({
    summary:
      'Workspace davetini kabul eder ve kullanıcıyı Member olarak ekler',
  })
  @ApiResponse({ status: 201, description: 'Davet kabul edildi, üyelik oluşturuldu.' })
  @ApiResponse({
    status: 403,
    description: 'Davet bu kullanıcının e-posta adresine ait değil.',
  })
  @ApiResponse({ status: 404, description: 'Davet bulunamadı.' })
  accept(
    @Param('id') id: string,
    @GetUser() user: { id: string; email?: string },
  ) {
    return this.invitationService.accept(id, user);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Workspace davetini reddeder' })
  @ApiResponse({ status: 200, description: 'Davet reddedildi.' })
  @ApiResponse({
    status: 403,
    description: 'Davet bu kullanıcının e-posta adresine ait değil.',
  })
  @ApiResponse({ status: 404, description: 'Davet bulunamadı.' })
  reject(
    @Param('id') id: string,
    @GetUser() user: { id: string; email?: string },
  ) {
    return this.invitationService.reject(id, user);
  }
}
