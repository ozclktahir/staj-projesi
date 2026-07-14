import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectService } from './project.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Roles('Admin', 'Member')
  @ApiOperation({ summary: 'Çalışma alanı içinde yeni bir proje oluşturur' })
  @ApiResponse({ status: 201, description: 'Proje başarıyla oluşturuldu.' })
  @ApiResponse({
    status: 403,
    description: 'Proje oluşturmak için Admin veya Member rolüne sahip olmanız gerekir.',
  })
  create(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: any,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.create(workspaceId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Çalışma alanına ait tüm projeleri listeler' })
  @ApiResponse({ status: 200, description: 'Projeler listelendi.' })
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.projectService.findAll(workspaceId);
  }

  @Delete(':id')
  @Roles('Admin', 'Member')
  @ApiOperation({ summary: 'Belirtilen projeyi siler' })
  @ApiResponse({ status: 200, description: 'Proje başarıyla silindi.' })
  @ApiResponse({
    status: 403,
    description: 'Proje silmek için Admin veya Member rolüne sahip olmanız gerekir.',
  })
  @ApiResponse({ status: 404, description: 'Proje bulunamadı.' })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.projectService.remove(workspaceId, id);
  }
}
