import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
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
import type { Request } from 'express';
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

function extractBearerToken(request: Request): string {
  const raw = request.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || typeof header !== 'string') return '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

@ApiTags('Personal')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('personal')
export class PersonalController {
  constructor(private readonly personalService: PersonalService) {}

  @Get('notes')
  @ApiOperation({ summary: 'Kişisel notları listeler' })
  listNotes(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.personalService.listNotes(
      user.id,
      Number(offset) || 0,
      Number(limit) || 30,
      extractBearerToken(request),
    );
  }

  @Post('notes')
  createNote(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Body() dto: CreatePersonalNoteDto,
  ) {
    return this.personalService.createNote(
      user.id,
      dto,
      extractBearerToken(request),
    );
  }

  @Patch('notes/:id')
  updateNote(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdatePersonalNoteDto,
  ) {
    return this.personalService.updateNote(
      user.id,
      id,
      dto,
      extractBearerToken(request),
    );
  }

  @Delete('notes/:id')
  deleteNote(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.personalService.deleteNote(
      user.id,
      id,
      extractBearerToken(request),
    );
  }

  @Get('todos')
  listTodos(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.personalService.listTodos(
      user.id,
      Number(offset) || 0,
      Number(limit) || 50,
      extractBearerToken(request),
    );
  }

  @Post('todos')
  createTodo(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Body() dto: CreatePersonalTodoDto,
  ) {
    return this.personalService.createTodo(
      user.id,
      dto,
      extractBearerToken(request),
    );
  }

  @Patch('todos/:id')
  updateTodo(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdatePersonalTodoDto,
  ) {
    return this.personalService.updateTodo(
      user.id,
      id,
      dto,
      extractBearerToken(request),
    );
  }

  @Delete('todos/:id')
  deleteTodo(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.personalService.deleteTodo(
      user.id,
      id,
      extractBearerToken(request),
    );
  }

  @Get('files')
  listFiles(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.personalService.listFiles(
      user.id,
      Number(offset) || 0,
      Number(limit) || 50,
      extractBearerToken(request),
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
    @Req() request: Request,
    @GetUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.personalService.uploadFile(
      user.id,
      file,
      extractBearerToken(request),
    );
  }

  @Delete('files/:id')
  deleteFile(
    @Req() request: Request,
    @GetUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.personalService.deleteFile(
      user.id,
      id,
      extractBearerToken(request),
    );
  }
}
