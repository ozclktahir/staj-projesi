import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    this.notificationGateway.emitToUser(dto.user_id, 'new_notification', data);

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
  async markAsRead(
    workspaceId: string,
    notificationId: string,
    userId: string,
  ) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Bildirim bulunamadı.');
    }

    this.notificationGateway.emitToUser(userId, 'notification_read', data);

    return data;
  }

  /**
   * Kullanıcının workspace içindeki tüm bildirimlerini okundu yapar.
   */
  async markAllAsRead(workspaceId: string, userId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const updated = data ?? [];
    this.notificationGateway.emitToUser(userId, 'notifications_read_all', {
      workspace_id: workspaceId,
      count: updated.length,
    });

    return {
      message: 'Tüm bildirimler okundu olarak işaretlendi.',
      count: updated.length,
    };
  }

  /**
   * Görev sahiplenme bildirimine kabul/red yanıtı (web respondToTaskClaim parity).
   */
  async respondToClaim(
    workspaceId: string,
    notificationId: string,
    userId: string,
    decision: 'accept' | 'decline',
  ) {
    const client = this.supabaseService.getClient();

    const { data: notif, error: notifError } = await client
      .from('notifications')
      .select('id, user_id, type, metadata, payload, workspace_id')
      .eq('id', notificationId)
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (notifError) {
      throw new BadRequestException(notifError.message);
    }
    if (!notif) {
      throw new NotFoundException('Bildirim bulunamadı.');
    }

    const meta =
      (notif.payload && typeof notif.payload === 'object'
        ? (notif.payload as Record<string, unknown>)
        : null) ||
      (notif.metadata && typeof notif.metadata === 'object'
        ? (notif.metadata as Record<string, unknown>)
        : null) ||
      {};

    const taskId = typeof meta.task_id === 'string' ? meta.task_id : null;
    if (!taskId) {
      throw new BadRequestException('Bildirimde görev bilgisi yok.');
    }

    const { data: task, error: taskError } = await client
      .from('tasks')
      .select(
        'id, title, project_id, workspace_id, assignee_id, assigned_to, assignment_status, created_by',
      )
      .eq('id', taskId)
      .maybeSingle();

    if (taskError) {
      throw new BadRequestException(taskError.message);
    }
    if (!task) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    const assignee =
      (typeof task.assignee_id === 'string' && task.assignee_id) ||
      (typeof task.assigned_to === 'string' && task.assigned_to) ||
      null;

    if (assignee !== userId) {
      throw new ForbiddenException(
        'Bu görevi yalnızca atanan kullanıcı kabul/reddedebilir.',
      );
    }

    const nextStatus = decision === 'accept' ? 'accepted' : 'rejected';
    const { data: updatedTask, error: updateError } = await client
      .from('tasks')
      .update({
        assignment_status: nextStatus,
        assignment_pending_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .maybeSingle();

    if (updateError) {
      if (updateError.message.includes('assignment_status')) {
        throw new BadRequestException(
          'assignment_status sütunu yok. Migration gerekli.',
        );
      }
      throw new BadRequestException(updateError.message);
    }

    await client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    const title = typeof task.title === 'string' ? task.title : 'görev';
    const projectId =
      typeof task.project_id === 'string' ? task.project_id : null;
    const taskWorkspaceId =
      typeof task.workspace_id === 'string' ? task.workspace_id : workspaceId;

    if (decision === 'decline' && taskWorkspaceId) {
      const adminIds = await this.getWorkspaceAdminIds(taskWorkspaceId);
      await Promise.all(
        adminIds
          .filter((id) => id !== userId)
          .map((adminId) =>
            this.create(taskWorkspaceId, {
              user_id: adminId,
              type: 'task_claim_rejected',
              title: 'Görev reddedildi',
              message: `'${title}' görevi reddedildi. Yeniden atamak için Yeni Görev penceresini kullanabilirsiniz.`,
              metadata: {
                task_id: taskId,
                project_id: projectId,
                task_title: title,
              },
            }),
          ),
      );
    }

    if (updatedTask) {
      this.notificationGateway.emitToWorkspace(
        taskWorkspaceId,
        'task_updated',
        updatedTask,
      );
    }

    this.notificationGateway.emitToUser(userId, 'notification_read', {
      id: notificationId,
      is_read: true,
    });

    return {
      success: true,
      message:
        decision === 'accept'
          ? 'Görev kabul edildi.'
          : 'Görev reddedildi. Yöneticiler bilgilendirildi.',
      assignment_status: nextStatus,
      task_id: taskId,
    };
  }

  /**
   * Silme onay bildirimine kabul/red (web respondToTaskDeletion parity).
   */
  async respondToDeletion(
    workspaceId: string,
    notificationId: string,
    userId: string,
    decision: 'accept' | 'decline',
  ) {
    const client = this.supabaseService.getClient();

    const { data: notif, error: notifError } = await client
      .from('notifications')
      .select('id, user_id, type, metadata, payload, workspace_id')
      .eq('id', notificationId)
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (notifError) throw new BadRequestException(notifError.message);
    if (!notif) throw new NotFoundException('Bildirim bulunamadı.');

    const meta =
      (notif.payload && typeof notif.payload === 'object'
        ? (notif.payload as Record<string, unknown>)
        : null) ||
      (notif.metadata && typeof notif.metadata === 'object'
        ? (notif.metadata as Record<string, unknown>)
        : null) ||
      {};

    const taskId =
      typeof meta.task_id === 'string' ? meta.task_id.trim() : '';
    if (!taskId) {
      throw new BadRequestException('Bildirimde görev bilgisi yok.');
    }

    const { data: task, error: taskError } = await client
      .from('tasks')
      .select(
        'id, title, project_id, workspace_id, assignee_id, assigned_to, deletion_status, deletion_requested_by',
      )
      .eq('id', taskId)
      .maybeSingle();

    if (taskError) throw new BadRequestException(taskError.message);
    if (!task) throw new NotFoundException('Görev bulunamadı veya silinmiş.');

    const taskWorkspaceId =
      typeof task.workspace_id === 'string' ? task.workspace_id : workspaceId;
    const projectId =
      typeof task.project_id === 'string' ? task.project_id : null;
    const title = typeof task.title === 'string' ? task.title : 'görev';
    const deletionStatus = String(task.deletion_status ?? 'none').toLowerCase();

    if (
      deletionStatus !== 'pending_admin_approval' &&
      deletionStatus !== 'pending_user_approval'
    ) {
      throw new BadRequestException(
        'Bu görev için bekleyen bir silme onayı yok.',
      );
    }

    const assignee =
      (typeof task.assignee_id === 'string' && task.assignee_id) ||
      (typeof task.assigned_to === 'string' && task.assigned_to) ||
      null;

    const isAdmin = (await this.getWorkspaceAdminIds(taskWorkspaceId)).includes(
      userId,
    );

    if (deletionStatus === 'pending_admin_approval' && !isAdmin) {
      throw new ForbiddenException('Bu onay yalnızca yöneticilere açık.');
    }
    if (deletionStatus === 'pending_user_approval' && assignee !== userId) {
      throw new ForbiddenException(
        'Bu onay yalnızca atanan kullanıcıya açık.',
      );
    }

    if (decision === 'decline') {
      const { error: resetError } = await client
        .from('tasks')
        .update({
          deletion_status: 'none',
          deletion_requested_by: null,
          deletion_requested_at: null,
        })
        .eq('id', taskId);

      if (resetError) throw new BadRequestException(resetError.message);

      await client
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      const requester =
        typeof task.deletion_requested_by === 'string'
          ? task.deletion_requested_by
          : null;
      if (requester && requester !== userId) {
        await this.create(taskWorkspaceId, {
          user_id: requester,
          type: 'task_deletion_rejected',
          title: 'Silme isteği reddedildi',
          message: `'${title}' görevi için silme onayı reddedildi.`,
          metadata: { task_id: taskId, project_id: projectId },
        });
      }

      this.notificationGateway.emitToWorkspace(
        taskWorkspaceId,
        'task_updated',
        { id: taskId, deletion_status: 'none' },
      );

      return {
        success: true,
        message: 'Silme isteği reddedildi. Görev duruyor.',
        deleted: false,
      };
    }

    const { error: deleteError } = await client
      .from('tasks')
      .update({ deleted_at: new Date().toISOString(), deletion_status: 'none' })
      .eq('id', taskId);

    if (deleteError) throw new BadRequestException(deleteError.message);

    await client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    this.notificationGateway.emitToWorkspace(taskWorkspaceId, 'task_deleted', {
      id: taskId,
      project_id: projectId,
    });

    return {
      success: true,
      message: 'Görev onaylandıktan sonra silindi.',
      deleted: true,
      deletedTaskId: taskId,
    };
  }

  private async getWorkspaceAdminIds(workspaceId: string): Promise<string[]> {
    const client = this.supabaseService.getClient();
    const ids = new Set<string>();

    const { data: workspace } = await client
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();
    if (typeof workspace?.owner_id === 'string') {
      ids.add(workspace.owner_id);
    }

    const { data: members } = await client
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId);

    for (const row of members ?? []) {
      const role = String(row.role ?? '')
        .trim()
        .toUpperCase();
      if (
        role === 'ADMIN' ||
        role === 'OWNER' ||
        row.role === 'Admin' ||
        row.role === 'OWNER'
      ) {
        if (typeof row.user_id === 'string') ids.add(row.user_id);
      }
    }

    return Array.from(ids);
  }
}
