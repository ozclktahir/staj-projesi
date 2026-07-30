import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationService } from '../notification/notification.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateTaskDto) {
    const client = this.supabaseService.getClient();
    const assigneeId = this.resolveAssigneeId(dto.assignee_id, dto.assigned_to);
    const needsClaim = Boolean(assigneeId && assigneeId !== userId);

    const payload: Record<string, unknown> = {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      assigned_to: dto.assigned_to ?? dto.assignee_id,
      assignee_id: dto.assignee_id ?? dto.assigned_to,
      due_date: dto.due_date,
      parent_task_id: dto.parent_task_id,
      project_id: dto.project_id,
      file_url: dto.file_url,
      workspace_id: workspaceId,
      created_by: userId,
      assignment_status: needsClaim ? 'pending' : 'accepted',
      assignment_pending_at: needsClaim ? new Date().toISOString() : null,
    };

    let { data, error } = await client
      .from('tasks')
      .insert(payload)
      .select()
      .single();

    if (
      error &&
      (error.message.includes('assignment_status') ||
        error.message.includes('assignment_pending_at'))
    ) {
      const retry = { ...payload };
      delete retry.assignment_status;
      delete retry.assignment_pending_at;
      ({ data, error } = await client.from('tasks').insert(retry).select().single());
    }

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (needsClaim && assigneeId) {
      await this.notifyClaimRequest({
        workspaceId,
        assigneeId,
        taskId: data.id,
        taskTitle: data.title,
        projectId: data.project_id ?? dto.project_id ?? null,
      });
    }

    return data;
  }

  async findAll(workspaceId: string, filterDto: GetTasksFilterDto) {
    const client = this.supabaseService.getClient();
    const { search, status, priority, assignee_id, parent_task_id, projectId } =
      filterDto;
    const page = filterDto.page ?? 1;
    const limit = filterDto.limit ?? 10;

    let query = client
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null);

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (assignee_id) {
      query = query.eq('assignee_id', assignee_id);
    }

    if (parent_task_id) {
      query = query.eq('parent_task_id', parent_task_id);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const total = count ?? 0;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(workspaceId: string, taskId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', taskId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    return data;
  }

  async update(
    workspaceId: string,
    taskId: string,
    actorUserId: string,
    dto: UpdateTaskDto,
  ) {
    const client = this.supabaseService.getClient();

    const existing = await this.findOne(workspaceId, taskId);
    const existingAssignment = String(
      existing.assignment_status ?? '',
    ).toLowerCase();

    if (
      dto.status !== undefined &&
      dto.status !== existing.status &&
      existingAssignment === 'pending'
    ) {
      throw new ForbiddenException(
        'Sahiplenme onayı bekleyen görevin durumu değiştirilemez.',
      );
    }

    const previousAssignee = this.resolveAssigneeId(
      existing.assignee_id,
      existing.assigned_to,
    );

    const patch: Record<string, unknown> = {
      ...dto,
      updated_at: new Date().toISOString(),
    };

    const assigneeTouched =
      dto.assignee_id !== undefined || dto.assigned_to !== undefined;

    if (assigneeTouched) {
      const nextAssignee = this.resolveAssigneeId(
        dto.assignee_id !== undefined ? dto.assignee_id : existing.assignee_id,
        dto.assigned_to !== undefined ? dto.assigned_to : existing.assigned_to,
      );

      if (dto.assignee_id !== undefined && dto.assigned_to === undefined) {
        patch.assigned_to = dto.assignee_id;
      }
      if (dto.assigned_to !== undefined && dto.assignee_id === undefined) {
        patch.assignee_id = dto.assigned_to;
      }

      if (nextAssignee && nextAssignee !== actorUserId) {
        patch.assignment_status = 'pending';
        patch.assignment_pending_at = new Date().toISOString();
      } else {
        patch.assignment_status = 'accepted';
        patch.assignment_pending_at = null;
      }
    }

    let { data, error } = await client
      .from('tasks')
      .update(patch)
      .eq('workspace_id', workspaceId)
      .eq('id', taskId)
      .select()
      .maybeSingle();

    if (
      error &&
      (error.message.includes('assignment_status') ||
        error.message.includes('assignment_pending_at'))
    ) {
      const retry = { ...patch };
      delete retry.assignment_status;
      delete retry.assignment_pending_at;
      ({ data, error } = await client
        .from('tasks')
        .update(retry)
        .eq('workspace_id', workspaceId)
        .eq('id', taskId)
        .select()
        .maybeSingle());
    }

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    const nextAssignee = this.resolveAssigneeId(
      data.assignee_id,
      data.assigned_to,
    );

    if (nextAssignee && nextAssignee !== previousAssignee) {
      await this.notifyClaimRequest({
        workspaceId,
        assigneeId: nextAssignee,
        taskId: data.id,
        taskTitle: data.title,
        projectId: data.project_id ?? null,
      });
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      const creatorId = data.created_by ?? existing.created_by;
      if (creatorId) {
        await this.notifyCreatorStatusChange({
          workspaceId,
          creatorId,
          taskId: data.id,
          taskTitle: data.title,
          previousStatus: existing.status,
          nextStatus: dto.status,
        });
      }
    }

    this.notificationGateway.emitToWorkspace(workspaceId, 'task_updated', data);

    return data;
  }

  /**
   * Dual silme: ilerleme yoksa soft-delete; varsa onay akışı.
   */
  async requestOrDelete(
    workspaceId: string,
    taskId: string,
    actorUserId: string,
  ) {
    const client = this.supabaseService.getClient();
    const existing = await this.findOne(workspaceId, taskId);

    const assignee = this.resolveAssigneeId(
      existing.assignee_id,
      existing.assigned_to,
    );
    const isAdmin = await this.isWorkspaceAdmin(workspaceId, actorUserId);

    if (
      !isAdmin &&
      assignee !== actorUserId &&
      existing.created_by !== actorUserId
    ) {
      throw new ForbiddenException('Bu görevi silme yetkiniz yok.');
    }

    const currentDeletion = String(
      existing.deletion_status ?? 'none',
    ).toLowerCase();
    if (
      currentDeletion === 'pending_admin_approval' ||
      currentDeletion === 'pending_user_approval'
    ) {
      throw new BadRequestException(
        'Bu görev için zaten bir silme onayı bekleniyor.',
      );
    }

    const hasProgress = await this.taskHasProgress(
      taskId,
      typeof existing.status === 'string' ? existing.status : null,
    );
    const title =
      typeof existing.title === 'string' ? existing.title : 'görev';
    const projectId =
      typeof existing.project_id === 'string' ? existing.project_id : null;

    if (!hasProgress) {
      const { data, error } = await client
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('id', taskId)
        .is('deleted_at', null)
        .select()
        .maybeSingle();

      if (error) throw new BadRequestException(error.message);
      if (!data) throw new NotFoundException('Görev bulunamadı.');

      this.notificationGateway.emitToWorkspace(workspaceId, 'task_deleted', {
        id: taskId,
        project_id: projectId,
      });

      return {
        mode: 'deleted' as const,
        message: 'Görev silindi.',
        taskId,
        projectId,
      };
    }

    const requestedAt = new Date().toISOString();

    if (isAdmin) {
      if (!assignee) {
        throw new BadRequestException(
          'Bu görevde ilerleme var ancak atanan kullanıcı yok. Onaylı silme için önce bir kullanıcı atayın.',
        );
      }

      const { error } = await client
        .from('tasks')
        .update({
          deletion_status: 'pending_user_approval',
          deletion_requested_by: actorUserId,
          deletion_requested_at: requestedAt,
        })
        .eq('id', taskId);

      if (error) {
        if (
          error.message.includes('deletion_status') ||
          error.message.includes('deletion_requested')
        ) {
          throw new BadRequestException(
            'Silme onay sütunları henüz yok. Migration gerekli.',
          );
        }
        throw new BadRequestException(error.message);
      }

      await this.notificationService.create(workspaceId, {
        user_id: assignee,
        type: 'task_deletion_request',
        title: 'Silme onayı gerekli',
        message: `Yönetici, '${title}' görevini silmek istiyor. Onaylıyor musun?`,
        metadata: {
          task_id: taskId,
          project_id: projectId,
          workspace_id: workspaceId,
          task_title: title,
          action: 'deletion_user_approval',
          requested_by: actorUserId,
        },
      });

      this.notificationGateway.emitToWorkspace(workspaceId, 'task_updated', {
        id: taskId,
        deletion_status: 'pending_user_approval',
      });

      return {
        mode: 'approval_requested' as const,
        message:
          'Silme isteği atanan kullanıcıya gönderildi. Onay bekleniyor — görev silinmedi.',
        taskId,
        projectId,
        deletionStatus: 'pending_user_approval',
      };
    }

    const { error } = await client
      .from('tasks')
      .update({
        deletion_status: 'pending_admin_approval',
        deletion_requested_by: actorUserId,
        deletion_requested_at: requestedAt,
      })
      .eq('id', taskId);

    if (error) {
      if (
        error.message.includes('deletion_status') ||
        error.message.includes('deletion_requested')
      ) {
        throw new BadRequestException(
          'Silme onay sütunları henüz yok. Migration gerekli.',
        );
      }
      throw new BadRequestException(error.message);
    }

    const adminIds = (await this.getWorkspaceAdminIds(workspaceId)).filter(
      (id) => id !== actorUserId,
    );

    if (adminIds.length === 0) {
      await client
        .from('tasks')
        .update({
          deletion_status: 'none',
          deletion_requested_by: null,
          deletion_requested_at: null,
        })
        .eq('id', taskId);
      throw new BadRequestException(
        'Onaylayacak yönetici bulunamadı. Silme isteği oluşturulamadı; görev silinmedi.',
      );
    }

    await Promise.all(
      adminIds.map((adminId) =>
        this.notificationService.create(workspaceId, {
          user_id: adminId,
          type: 'task_deletion_request',
          title: 'Silme onayı gerekli',
          message: `'${title}' görevi için silme onayı isteniyor.`,
          metadata: {
            task_id: taskId,
            project_id: projectId,
            workspace_id: workspaceId,
            task_title: title,
            action: 'deletion_admin_approval',
            requested_by: actorUserId,
          },
        }),
      ),
    );

    this.notificationGateway.emitToWorkspace(workspaceId, 'task_updated', {
      id: taskId,
      deletion_status: 'pending_admin_approval',
    });

    return {
      mode: 'approval_requested' as const,
      message:
        'Silme isteği yöneticilere gönderildi. Onay bekleniyor — görev silinmedi.',
      taskId,
      projectId,
      deletionStatus: 'pending_admin_approval',
    };
  }

  async listRejectedTasks(
    workspaceId: string,
    projectId: string,
    actorUserId: string,
  ) {
    if (!(await this.isWorkspaceAdmin(workspaceId, actorUserId))) {
      throw new ForbiddenException(
        'Reddedilen görevler yalnızca yöneticilere açıktır.',
      );
    }
    if (!projectId?.trim()) {
      throw new BadRequestException('projectId zorunludur.');
    }

    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('tasks')
      .select(
        'id, title, description, priority, due_date, assignee_id, assigned_to, assignment_status',
      )
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectId)
      .eq('assignment_status', 'rejected')
      .is('deleted_at', null)
      .is('parent_task_id', null)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { tasks: data ?? [] };
  }

  async reassignRejectedTask(
    workspaceId: string,
    taskId: string,
    actorUserId: string,
    assigneeId: string,
    dueDate?: string | null,
  ) {
    if (!(await this.isWorkspaceAdmin(workspaceId, actorUserId))) {
      throw new ForbiddenException(
        'Yeniden atama yalnızca yöneticiler içindir.',
      );
    }

    const nextAssignee = assigneeId?.trim();
    if (!nextAssignee) {
      throw new BadRequestException('Yeni atanan kişi zorunludur.');
    }

    const existing = await this.findOne(workspaceId, taskId);
    const status = String(existing.assignment_status ?? '').toLowerCase();
    if (status !== 'rejected') {
      throw new BadRequestException(
        'Yalnızca reddedilmiş görevler yeniden atanabilir.',
      );
    }

    const client = this.supabaseService.getClient();
    const patch: Record<string, unknown> = {
      assignee_id: nextAssignee,
      assigned_to: nextAssignee,
      assignment_status: 'pending',
      assignment_pending_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (dueDate !== undefined) {
      patch.due_date = dueDate?.trim() || null;
    }

    const { data, error } = await client
      .from('tasks')
      .update(patch)
      .eq('id', taskId)
      .eq('workspace_id', workspaceId)
      .select()
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Görev bulunamadı.');

    await this.notifyClaimRequest({
      workspaceId,
      assigneeId: nextAssignee,
      taskId: data.id,
      taskTitle: data.title,
      projectId: data.project_id ?? null,
    });

    this.notificationGateway.emitToWorkspace(workspaceId, 'task_updated', data);

    return {
      success: true,
      message: 'Görev yeniden atandı. Sahiplenme onayı bekleniyor.',
      task: data,
    };
  }

  /**
   * Soft-delete edilmiş görevi geri getirir (deleted_at = null).
   */
  async restore(workspaceId: string, taskId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('tasks')
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .eq('id', taskId)
      .not('deleted_at', 'is', null)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException(
        'Arşivlenmiş görev bulunamadı veya görev zaten aktif.',
      );
    }

    return data;
  }

  private resolveAssigneeId(
    assigneeId?: string | null,
    assignedTo?: string | null,
  ): string | undefined {
    return assigneeId || assignedTo || undefined;
  }

  private async taskHasProgress(
    taskId: string,
    status: string | null,
  ): Promise<boolean> {
    const normalized = String(status ?? '')
      .trim()
      .toUpperCase();
    if (normalized && normalized !== 'TODO') return true;

    const client = this.supabaseService.getClient();
    const [comments, files, subtasks] = await Promise.all([
      client
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskId),
      client
        .from('files')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskId),
      client
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('parent_task_id', taskId)
        .is('deleted_at', null),
    ]);

    if ((comments.count ?? 0) > 0) return true;
    if ((files.count ?? 0) > 0) return true;
    if ((subtasks.count ?? 0) > 0) return true;
    return false;
  }

  private async isWorkspaceAdmin(
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    const client = this.supabaseService.getClient();
    const { data: workspace } = await client
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();
    if (workspace?.owner_id === userId) return true;

    const { data: membership } = await client
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    const role = String(membership?.role ?? '')
      .trim()
      .toUpperCase();
    return (
      role === 'ADMIN' ||
      role === 'OWNER' ||
      membership?.role === 'Admin' ||
      membership?.role === 'OWNER'
    );
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

  private async notifyClaimRequest(params: {
    workspaceId: string;
    assigneeId: string;
    taskId: string;
    taskTitle: string;
    projectId: string | null;
  }) {
    try {
      await this.notificationService.create(params.workspaceId, {
        user_id: params.assigneeId,
        type: 'task_claim_request',
        title: 'Görev ataması — onayınız gerekli',
        message: `"${params.taskTitle}" görevi size atandı. Kabul ediyor musunuz?`,
        metadata: {
          task_id: params.taskId,
          project_id: params.projectId,
          task_title: params.taskTitle,
          workspace_id: params.workspaceId,
          action: 'task_claim',
          event: 'task_claim_request',
        },
      });
    } catch (error) {
      this.logger.warn(
        `Claim bildirimi gönderilemedi (task=${params.taskId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async notifyCreatorStatusChange(params: {
    workspaceId: string;
    creatorId: string;
    taskId: string;
    taskTitle: string;
    previousStatus: string;
    nextStatus: string;
  }) {
    try {
      await this.notificationService.create(params.workspaceId, {
        user_id: params.creatorId,
        type: 'TASK_STATUS_CHANGED',
        title: 'Görev Durumu Güncellendi',
        message: `"${params.taskTitle}" görevinin durumu ${params.previousStatus} → ${params.nextStatus} olarak güncellendi.`,
        metadata: {
          task_id: params.taskId,
          previous_status: params.previousStatus,
          next_status: params.nextStatus,
          event: 'task_status_changed',
        },
      });
    } catch (error) {
      this.logger.warn(
        `Durum bildirimi gönderilemedi (task=${params.taskId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
