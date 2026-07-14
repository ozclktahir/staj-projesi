import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [SupabaseModule],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
