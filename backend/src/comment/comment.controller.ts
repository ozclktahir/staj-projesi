import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/tasks/:taskId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @Roles('Admin', 'Member')
  @ApiOperation({ summary: 'Bir göreve yeni bir yorum ekler' })
  @ApiResponse({ status: 201, description: 'Yorum başarıyla oluşturuldu.' })
  @ApiResponse({
    status: 403,
    description: 'Yorum yazmak için Admin veya Member rolüne sahip olmanız gerekir.',
  })
  create(
    @Param('taskId') taskId: string,
    @GetUser() user: any,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(taskId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Bir göreve ait tüm yorumları listeler' })
  @ApiResponse({ status: 200, description: 'Yorumlar listelendi.' })
  findAll(@Param('taskId') taskId: string) {
    return this.commentService.findAll(taskId);
  }
}
