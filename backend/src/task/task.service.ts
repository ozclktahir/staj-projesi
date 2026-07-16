import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(workspaceId: string, userId: string, dto: CreateTaskDto) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('tasks')
      .insert({
        ...dto,
        workspace_id: workspaceId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findAll(workspaceId: string, filterDto: GetTasksFilterDto) {
    const client = this.supabaseService.getClient();
    const { search, status, priority, assignee_id, parent_task_id } = filterDto;
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
}
