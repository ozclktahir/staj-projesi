import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';
import { CreateFileDto } from './dto/create-file.dto';
import { FileService } from './file.service';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/tasks/:taskId/files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post()
  @ApiOperation({ summary: 'Bir göreve dosya kaydı ekler' })
  @ApiResponse({ status: 201, description: 'Dosya kaydı başarıyla oluşturuldu.' })
  create(
    @Param('taskId') taskId: string,
    @GetUser() user: any,
    @Body() dto: CreateFileDto,
  ) {
    return this.fileService.create(taskId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Bir göreve ait tüm dosyaları listeler' })
  @ApiResponse({ status: 200, description: 'Dosyalar listelendi.' })
  findAll(@Param('taskId') taskId: string) {
    return this.fileService.findAll(taskId);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Belirtilen dosya kaydını siler' })
  @ApiResponse({ status: 200, description: 'Dosya başarıyla silindi.' })
  @ApiResponse({ status: 404, description: 'Dosya bulunamadı.' })
  remove(@Param('fileId') fileId: string) {
    return this.fileService.remove(fileId);
  }
}
