import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(workspaceId: string, userId: string, dto: CreateProjectDto) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('projects')
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
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async remove(workspaceId: string, projectId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('projects')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', projectId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    return { message: 'Proje başarıyla silindi.' };
  }
}
