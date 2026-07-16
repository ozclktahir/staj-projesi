import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateTaskDto) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('tasks')
      .insert({
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        assigned_to: dto.assigned_to,
        assignee_id: dto.assignee_id,
        due_date: dto.due_date,
        parent_task_id: dto.parent_task_id,
        project_id: dto.project_id,
        file_url: dto.file_url,
        workspace_id: workspaceId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const assigneeId = this.resolveAssigneeId(dto.assignee_id, dto.assigned_to);
    if (assigneeId && assigneeId !== userId) {
      await this.notifyAssignee({
        workspaceId,
        assigneeId,
        taskId: data.id,
        taskTitle: data.title,
        isCreate: true,
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

  async update(workspaceId: string, taskId: string, dto: UpdateTaskDto) {
    const client = this.supabaseService.getClient();

    const existing = await this.findOne(workspaceId, taskId);

    const { data, error } = await client
      .from('tasks')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('id', taskId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    const previousAssignee = this.resolveAssigneeId(
      existing.assignee_id,
      existing.assigned_to,
    );
    const nextAssignee = this.resolveAssigneeId(
      dto.assignee_id !== undefined ? dto.assignee_id : data.assignee_id,
      dto.assigned_to !== undefined ? dto.assigned_to : data.assigned_to,
    );

    // Yeni atama veya atanan kişi değiştiyse ilgili kullanıcıya bildirim gönder.
    if (nextAssignee && nextAssignee !== previousAssignee) {
      await this.notifyAssignee({
        workspaceId,
        assigneeId: nextAssignee,
        taskId: data.id,
        taskTitle: data.title,
        isCreate: false,
      });
    }

    // Durum değiştiyse görevi oluşturan kişiye bildirim gönder.
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

    return data;
  }

  async remove(workspaceId: string, taskId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('id', taskId)
      .is('deleted_at', null)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    return { message: 'Görev başarıyla arşivlendi.' };
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

  private async notifyAssignee(params: {
    workspaceId: string;
    assigneeId: string;
    taskId: string;
    taskTitle: string;
    isCreate: boolean;
  }) {
    try {
      await this.notificationService.create(params.workspaceId, {
        user_id: params.assigneeId,
        type: params.isCreate ? 'TASK_ASSIGNED' : 'TASK_UPDATED',
        title: params.isCreate ? 'Yeni Görev Atandı' : 'Görev Güncellendi',
        message: `"${params.taskTitle}" görevi size atandı.`,
        metadata: {
          task_id: params.taskId,
          event: params.isCreate ? 'task_assigned' : 'task_reassigned',
        },
      });
    } catch (error) {
      this.logger.warn(
        `Assignee bildirimi gönderilemedi (task=${params.taskId}): ${
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
