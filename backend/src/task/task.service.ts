import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTaskDto } from './dto/create-task.dto';
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

  async findAll(workspaceId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
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
      .delete()
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

    return { message: 'Görev başarıyla silindi.' };
  }
}
