import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  CreatePersonalNoteDto,
  CreatePersonalTodoDto,
  UpdatePersonalNoteDto,
  UpdatePersonalTodoDto,
} from './dto/personal.dto';
import { PersonalService } from './personal.service';

@ApiTags('Personal')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('personal')
export class PersonalController {
  constructor(private readonly personalService: PersonalService) {}

  // Notes
  @Get('notes')
  @ApiOperation({ summary: 'Kişisel notları listeler' })
  listNotes(
    @GetUser() user: { id: string },
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.personalService.listNotes(
      user.id,
      Number(offset) || 0,
      Number(limit) || 30,
    );
  }

  @Post('notes')
  createNote(
    @GetUser() user: { id: string },
    @Body() dto: CreatePersonalNoteDto,
  ) {
    return this.personalService.createNote(user.id, dto);
  }

  @Patch('notes/:id')
  updateNote(
    @GetUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdatePersonalNoteDto,
  ) {
    return this.personalService.updateNote(user.id, id, dto);
  }

  @Delete('notes/:id')
  deleteNote(@GetUser() user: { id: string }, @Param('id') id: string) {
    return this.personalService.deleteNote(user.id, id);
  }

  // Todos
  @Get('todos')
  listTodos(
    @GetUser() user: { id: string },
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.personalService.listTodos(
      user.id,
      Number(offset) || 0,
      Number(limit) || 50,
    );
  }

  @Post('todos')
  createTodo(
    @GetUser() user: { id: string },
    @Body() dto: CreatePersonalTodoDto,
  ) {
    return this.personalService.createTodo(user.id, dto);
  }

  @Patch('todos/:id')
  updateTodo(
    @GetUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdatePersonalTodoDto,
  ) {
    return this.personalService.updateTodo(user.id, id, dto);
  }

  @Delete('todos/:id')
  deleteTodo(@GetUser() user: { id: string }, @Param('id') id: string) {
    return this.personalService.deleteTodo(user.id, id);
  }

  // Files
  @Get('files')
  listFiles(
    @GetUser() user: { id: string },
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.personalService.listFiles(
      user.id,
      Number(offset) || 0,
      Number(limit) || 50,
    );
  }

  @Post('files/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  uploadFile(
    @GetUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.personalService.uploadFile(user.id, file);
  }

  @Delete('files/:id')
  deleteFile(@GetUser() user: { id: string }, @Param('id') id: string) {
    return this.personalService.deleteFile(user.id, id);
  }
}
