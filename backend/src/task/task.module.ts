import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [SupabaseModule, NotificationModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
