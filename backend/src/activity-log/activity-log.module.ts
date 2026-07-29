import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';

@Module({
  imports: [SupabaseModule, NotificationModule],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
