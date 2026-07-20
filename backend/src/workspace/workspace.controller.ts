import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { WorkspaceService } from './workspace.service';

function extractBearerToken(request: Request): string {
  const raw = request.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || typeof header !== 'string') return '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

@ApiTags('Workspace')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni bir çalışma alanı (workspace) oluşturur' })
  @ApiResponse({
    status: 201,
    description:
      'Çalışma alanı oluşturuldu; oluşturan kullanıcı otomatik olarak Admin rolüyle eklendi.',
  })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama başarısız.' })
  create(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaceService.create(
      user.id,
      dto,
      extractBearerToken(request),
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Kullanıcının üye olduğu çalışma alanlarını listeler',
  })
  @ApiResponse({ status: 200, description: 'Çalışma alanları listelendi.' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama başarısız.' })
  findAll(@Req() request: Request, @GetUser() user: { id: string }) {
    return this.workspaceService.findAll(user.id, extractBearerToken(request));
  }

  @Post(':id/invite')
  @Roles('Admin')
  @UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
  @ApiOperation({
    summary: 'Belirtilen çalışma alanına yeni bir üye davet eder',
  })
  @ApiResponse({ status: 201, description: 'Davet başarıyla oluşturuldu.' })
  @ApiResponse({
    status: 403,
    description: 'Davet gönderebilmek için Admin rolüne sahip olmanız gerekir.',
  })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama başarısız.' })
  invite(
    @Param('id') id: string,
    @GetUser() user: { id: string },
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspaceService.invite(id, user.id, dto);
  }
}
