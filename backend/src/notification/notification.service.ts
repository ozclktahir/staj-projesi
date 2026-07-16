import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Bildirimi veritabanına kaydeder ve ilgili kullanıcıya WebSocket üzerinden emit eder.
   */
  async create(workspaceId: string, dto: CreateNotificationDto) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notifications')
      .insert({
        workspace_id: workspaceId,
        user_id: dto.user_id,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata ?? null,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    this.notificationGateway.emitToUser(dto.user_id, 'notification', data);

    return data;
  }

  /**
   * Kullanıcıya ait bildirimleri en yeniden eskiye listeler.
   */
  async findAllForUser(workspaceId: string, userId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  /**
   * Bildirimi okundu olarak işaretler ve kullanıcıya güncelleme emit eder.
   */
  async markAsRead(notificationId: string, userId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    this.notificationGateway.emitToUser(userId, 'notification_read', data);

    return data;
  }
}
