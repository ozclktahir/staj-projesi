import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Roles('Admin', 'Member')
  @UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
  @ApiOperation({ summary: 'Çalışma alanı içinde yeni bir görev oluşturur' })
  @ApiResponse({ status: 201, description: 'Görev başarıyla oluşturuldu.' })
  @ApiResponse({
    status: 403,
    description: 'Görev oluşturmak için Admin veya Member rolüne sahip olmanız gerekir.',
  })
  create(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: any,
    @Body() dto: CreateTaskDto,
  ) {
    return this.taskService.create(workspaceId, user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Çalışma alanına ait görevleri arama, filtreleme ve sayfalama ile listeler',
  })
  @ApiResponse({ status: 200, description: 'Görevler listelendi.' })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() filterDto: GetTasksFilterDto,
  ) {
    return this.taskService.findAll(workspaceId, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Belirtilen görevin detayını getirir' })
  @ApiResponse({ status: 200, description: 'Görev bulundu.' })
  @ApiResponse({ status: 404, description: 'Görev bulunamadı.' })
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.taskService.findOne(workspaceId, id);
  }

  @Patch(':id/restore')
  @Roles('Admin', 'Member')
  @UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
  @ApiOperation({
    summary: 'Soft-delete edilmiş görevi çöp kutusundan geri getirir',
  })
  @ApiResponse({ status: 200, description: 'Görev başarıyla geri getirildi.' })
  @ApiResponse({
    status: 403,
    description: 'Görev geri getirmek için Admin veya Member rolüne sahip olmanız gerekir.',
  })
  @ApiResponse({
    status: 404,
    description: 'Arşivlenmiş görev bulunamadı.',
  })
  restore(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.taskService.restore(workspaceId, id);
  }

  @Patch(':id')
  @Roles('Admin', 'Member')
  @UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
  @ApiOperation({ summary: 'Belirtilen görevi günceller' })
  @ApiResponse({ status: 200, description: 'Görev başarıyla güncellendi.' })
  @ApiResponse({
    status: 403,
    description: 'Görev güncellemek için Admin veya Member rolüne sahip olmanız gerekir.',
  })
  @ApiResponse({ status: 404, description: 'Görev bulunamadı.' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles('Admin', 'Member')
  @UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
  @ApiOperation({ summary: 'Belirtilen görevi siler' })
  @ApiResponse({ status: 200, description: 'Görev başarıyla silindi.' })
  @ApiResponse({
    status: 403,
    description: 'Görev silmek için Admin veya Member rolüne sahip olmanız gerekir.',
  })
  @ApiResponse({ status: 404, description: 'Görev bulunamadı.' })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.taskService.remove(workspaceId, id);
  }
}
