import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreatePersonalNoteDto,
  CreatePersonalTodoDto,
  UpdatePersonalNoteDto,
  UpdatePersonalTodoDto,
} from './dto/personal.dto';

@Injectable()
export class PersonalService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private client(accessToken?: string) {
    if (accessToken?.trim()) {
      return this.supabaseService.createUserClient(accessToken);
    }
    return (
      this.supabaseService.getAdminClient() ??
      this.supabaseService.getClient()
    );
  }

  // â”€â”€â”€ Notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listNotes(
    userId: string,
    offset = 0,
    limit = 30,
    accessToken?: string,
  ) {
    const client = this.client(accessToken);
    let { data, error } = await client
      .from('personal_notes')
      .select('id, title, content, task_id, is_completed, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error && /(task_id|is_completed)/i.test(error.message)) {
      const fallback = await client
        .from('personal_notes')
        .select('id, title, content, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);
      data = (fallback.data ?? []).map((row) => ({
        ...row,
        task_id: null,
        is_completed: false,
      }));
      error = fallback.error;
    }

    if (error) throw new BadRequestException(error.message);

    const rows = data ?? [];
    const taskIds = [
      ...new Set(
        rows
          .map((r) => (typeof r.task_id === 'string' ? r.task_id : null))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const titles = new Map<string, string>();
    if (taskIds.length > 0) {
      const { data: tasks } = await client
        .from('tasks')
        .select('id, title')
        .in('id', taskIds);
      for (const t of tasks ?? []) {
        if (typeof t.id === 'string') {
          titles.set(t.id, (t.title as string) || 'GÃ¶rev');
        }
      }
    }

    const notes = rows.map((row) => this.mapNote(row, titles));
    return { notes, hasMore: notes.length >= limit };
  }

  async createNote(userId: string, dto: CreatePersonalNoteDto, accessToken?: string) {
    const client = this.client(accessToken);
    const payload: Record<string, unknown> = {
      user_id: userId,
      title: dto.title.trim() || 'Basliksiz not',
      content: (dto.content ?? '').trim(),
      updated_at: new Date().toISOString(),
    };
    if (dto.taskId) payload.task_id = dto.taskId;

    let { data, error } = await client
      .from('personal_notes')
      .insert(payload)
      .select('*')
      .single();

    if (error && /task_id/i.test(error.message)) {
      delete payload.task_id;
      ({ data, error } = await client
        .from('personal_notes')
        .insert(payload)
        .select('*')
        .single());
    }

    if (error) throw new BadRequestException(error.message);
    return this.mapNote(data, new Map());
  }

  async updateNote(
    userId: string,
    noteId: string,
    dto: UpdatePersonalNoteDto,
    accessToken?: string,
  ) {
    const client = this.client(accessToken);
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.title !== undefined) patch.title = dto.title.trim() || 'Basliksiz not';
    if (dto.content !== undefined) patch.content = dto.content.trim();
    if (dto.taskId !== undefined) patch.task_id = dto.taskId || null;
    if (dto.isCompleted !== undefined) patch.is_completed = dto.isCompleted;

    let { data, error } = await client
      .from('personal_notes')
      .update(patch)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    if (error && /(task_id|is_completed)/i.test(error.message)) {
      const retry = { ...patch };
      delete retry.task_id;
      delete retry.is_completed;
      ({ data, error } = await client
        .from('personal_notes')
        .update(retry)
        .eq('id', noteId)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle());
    }

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Not bulunamadÄ±.');
    return this.mapNote(data, new Map());
  }

  async deleteNote(userId: string, noteId: string, accessToken?: string) {
    const client = this.client(accessToken);
    const { data, error } = await client
      .from('personal_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Not bulunamadÄ±.');
    return { message: 'Not silindi.', id: noteId };
  }

  // â”€â”€â”€ Todos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listTodos(userId: string, offset = 0, limit = 50, accessToken?: string) {
    const client = this.client(accessToken);
    const { data, error } = await client
      .from('personal_todos')
      .select('id, task, due_date, is_completed, created_at')
      .eq('user_id', userId)
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);
    const todos = (data ?? []).map((row) => this.mapTodo(row));
    return { todos, hasMore: todos.length >= limit };
  }

  async createTodo(userId: string, dto: CreatePersonalTodoDto, accessToken?: string) {
    const client = this.client(accessToken);
    const { data, error } = await client
      .from('personal_todos')
      .insert({
        user_id: userId,
        task: dto.task.trim(),
        due_date: dto.dueDate?.trim() || null,
        is_completed: false,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return this.mapTodo(data);
  }

  async updateTodo(
    userId: string,
    todoId: string,
    dto: UpdatePersonalTodoDto,
    accessToken?: string,
  ) {
    const client = this.client(accessToken);
    const patch: Record<string, unknown> = {};
    if (dto.task !== undefined) patch.task = dto.task.trim();
    if (dto.dueDate !== undefined) patch.due_date = dto.dueDate?.trim() || null;
    if (dto.isCompleted !== undefined) patch.is_completed = dto.isCompleted;

    const { data, error } = await client
      .from('personal_todos')
      .update(patch)
      .eq('id', todoId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Todo bulunamadÄ±.');
    return this.mapTodo(data);
  }

  async deleteTodo(userId: string, todoId: string, accessToken?: string) {
    const client = this.client(accessToken);
    const { data, error } = await client
      .from('personal_todos')
      .delete()
      .eq('id', todoId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Todo bulunamadÄ±.');
    return { message: 'Todo silindi.', id: todoId };
  }

  // â”€â”€â”€ Files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listFiles(userId: string, offset = 0, limit = 50, accessToken?: string) {
    const client = this.client(accessToken);
    const { data, error } = await client
      .from('personal_files')
      .select('id, file_name, file_url, storage_path, file_size, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);

    const files = await Promise.all(
      (data ?? []).map(async (row) => {
        let fileUrl = (row.file_url as string) || '';
        const storagePath = row.storage_path as string | null;
        if (storagePath) {
          const signed = await client.storage
            .from('personal-files')
            .createSignedUrl(storagePath, 60 * 60);
          if (!signed.error && signed.data?.signedUrl) {
            fileUrl = signed.data.signedUrl;
          }
        }
        return this.mapFile({ ...row, file_url: fileUrl });
      }),
    );

    return { files, hasMore: files.length >= limit };
  }

  async uploadFile(userId: string, file: Express.Multer.File, accessToken?: string) {
    if (!file) throw new BadRequestException('Dosya gerekli.');
    if (file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('Dosya en fazla 25MB olabilir.');
    }

    const client = this.client(accessToken);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await client.storage
      .from('personal-files')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw new BadRequestException(uploadError.message);

    const signed = await client.storage
      .from('personal-files')
      .createSignedUrl(storagePath, 60 * 60);

    const fileUrl = signed.data?.signedUrl ?? '';

    const { data, error } = await client
      .from('personal_files')
      .insert({
        user_id: userId,
        file_name: file.originalname,
        file_url: fileUrl,
        storage_path: storagePath,
        file_size: file.size,
      })
      .select('*')
      .single();

    if (error) {
      await client.storage.from('personal-files').remove([storagePath]);
      throw new BadRequestException(error.message);
    }

    return this.mapFile(data);
  }

  async deleteFile(userId: string, fileId: string, accessToken?: string) {
    const client = this.client(accessToken);
    const { data: existing, error: fetchError } = await client
      .from('personal_files')
      .select('id, storage_path')
      .eq('id', fileId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw new BadRequestException(fetchError.message);
    if (!existing) throw new NotFoundException('Dosya bulunamadÄ±.');

    if (typeof existing.storage_path === 'string' && existing.storage_path) {
      await client.storage
        .from('personal-files')
        .remove([existing.storage_path]);
    }

    const { error } = await client
      .from('personal_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Dosya silindi.', id: fileId };
  }

  private mapNote(
    row: Record<string, unknown>,
    titles: Map<string, string>,
  ) {
    const taskId = typeof row.task_id === 'string' ? row.task_id : null;
    return {
      id: String(row.id),
      title: String(row.title ?? ''),
      content: String(row.content ?? ''),
      taskId,
      taskTitle: taskId ? (titles.get(taskId) ?? null) : null,
      isCompleted: Boolean(row.is_completed),
      createdAt: (row.created_at as string | null) ?? null,
      updatedAt: (row.updated_at as string | null) ?? null,
    };
  }

  private mapTodo(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      task: String(row.task ?? ''),
      dueDate: (row.due_date as string | null) ?? null,
      isCompleted: Boolean(row.is_completed),
      createdAt: (row.created_at as string | null) ?? null,
    };
  }

  private mapFile(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      fileName: String(row.file_name ?? ''),
      fileUrl: String(row.file_url ?? ''),
      storagePath: (row.storage_path as string | null) ?? null,
      fileSize: (row.file_size as number | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
    };
  }
}

