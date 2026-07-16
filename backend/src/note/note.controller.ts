import {
  Body,
  Controller,
  Delete,
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
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteService } from './note.service';

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  // DİKKAT: Bu route, `GET /:id` ile path çakışmasını önlemek için o route'tan
  // önce tanımlanmıştır. Aksi hâlde Express/Nest router "dashboard" değerini
  // `:id` parametresi olarak yakalar.
  @Get('dashboard/me')
  @ApiOperation({
    summary:
      'Kullanıcının kişisel panosunu (son notlar, aktif projeler, güncel görevler) getirir',
  })
  @ApiResponse({ status: 200, description: 'Pano verisi başarıyla getirildi.' })
  getMyDashboard(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: any,
  ) {
    return this.noteService.getUserDashboard(workspaceId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Çalışma alanı içinde yeni bir not oluşturur' })
  @ApiResponse({ status: 201, description: 'Not başarıyla oluşturuldu.' })
  create(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: any,
    @Body() dto: CreateNoteDto,
  ) {
    return this.noteService.create(workspaceId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Kullanıcının çalışma alanındaki notlarını listeler' })
  @ApiResponse({ status: 200, description: 'Notlar listelendi.' })
  findAll(@Param('workspaceId') workspaceId: string, @GetUser() user: any) {
    return this.noteService.findAll(workspaceId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Belirtilen notun detayını getirir' })
  @ApiResponse({ status: 200, description: 'Not bulundu.' })
  @ApiResponse({ status: 404, description: 'Not bulunamadı.' })
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.noteService.findOne(workspaceId, user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Belirtilen notu günceller' })
  @ApiResponse({ status: 200, description: 'Not başarıyla güncellendi.' })
  @ApiResponse({ status: 404, description: 'Not bulunamadı.' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.noteService.update(workspaceId, user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Belirtilen notu siler' })
  @ApiResponse({ status: 200, description: 'Not başarıyla silindi.' })
  @ApiResponse({ status: 404, description: 'Not bulunamadı.' })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.noteService.remove(workspaceId, user.id, id);
  }
}
