import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [SupabaseModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
