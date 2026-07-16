import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { NotificationsController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

@Module({
  imports: [SupabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationGateway, NotificationService],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
