import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NoteService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(workspaceId: string, userId: string, dto: CreateNoteDto) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notes')
      .insert({
        ...dto,
        workspace_id: workspaceId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findAll(workspaceId: string, userId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findOne(workspaceId: string, userId: string, noteId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('id', noteId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Not bulunamadı.');
    }

    return data;
  }

  async update(
    workspaceId: string,
    userId: string,
    noteId: string,
    dto: UpdateNoteDto,
  ) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notes')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('id', noteId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Not bulunamadı.');
    }

    return data;
  }

  async remove(workspaceId: string, userId: string, noteId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notes')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('id', noteId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Not bulunamadı.');
    }

    return { message: 'Not başarıyla silindi.' };
  }

  /**
   * Kişisel Pano (Dashboard): kullanıcının en son notlarını, çalışma alanındaki
   * aktif projeleri ve güncel görevlerini tek bir istekte toplayan agregasyon.
   */
  async getUserDashboard(workspaceId: string, userId: string) {
    const client = this.supabaseService.getClient();

    const [notesResult, projectsResult, tasksResult] = await Promise.all([
      client
        .from('notes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5),
      client
        .from('projects')
        .select('*')
        .eq('workspace_id', workspaceId)
        .limit(5),
      // `tasks` tablosunda bir `user_id` kolonu bulunmadığından (görevler
      // `created_by`/`assigned_to` ile ilişkilendiriliyor), kullanıcıya özel
      // filtreleme yerine workspace bazlı, açık durumdaki en güncel görevler
      // getiriliyor.
      client
        .from('tasks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('status', ['TODO', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (notesResult.error) {
      throw new BadRequestException(notesResult.error.message);
    }

    if (projectsResult.error) {
      throw new BadRequestException(projectsResult.error.message);
    }

    if (tasksResult.error) {
      throw new BadRequestException(tasksResult.error.message);
    }

    return {
      recentNotes: notesResult.data,
      activeProjects: projectsResult.data,
      currentTasks: tasksResult.data,
    };
  }
}
