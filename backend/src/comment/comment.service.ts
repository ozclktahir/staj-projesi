import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(taskId: string, userId: string, dto: CreateCommentDto) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        content: dto.content,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findAll(taskId: string) {
    const client = this.supabaseService.getClient();

    const { data: comments, error } = await client
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    // PostgREST, `auth.users` şemasını anon istemciye açmadığı için gerçek bir
    // foreign-key join yerine `profiles` tablosundan ilgili kullanıcıları ayrıca
    // çekip `user_id` üzerinden eşleştiriyoruz (simüle edilmiş join).
    const userIds = [...new Set(comments.map((comment: any) => comment.user_id))];

    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (profilesError) {
      return comments.map((comment: any) => ({ ...comment, author: null }));
    }

    const profileById = new Map(
      (profiles ?? []).map((profile: any) => [profile.id, profile]),
    );

    return comments.map((comment: any) => ({
      ...comment,
      author: profileById.get(comment.user_id) ?? null,
    }));
  }
}
