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

    // Supabase'in anon istemcisi `auth.users` şemasına doğrudan erişemediği için
    // yorumlar şimdilik `user_id` ile birlikte döndürülüyor; kullanıcı profili bilgisi
    // (ad, e-posta vb.) ileride bir `profiles` tablosu eklendiğinde buraya join edilebilir.
    const { data, error } = await client
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }
}
