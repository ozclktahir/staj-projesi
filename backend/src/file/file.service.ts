import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateFileDto } from './dto/create-file.dto';

@Injectable()
export class FileService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async upload(
    file: Express.Multer.File,
    workspaceId: string,
    taskId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Yüklenecek dosya bulunamadı.');
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${workspaceId}/${taskId}/${Date.now()}-${safeName}`;

    const url = await this.supabaseService.uploadFile(file, path);

    return {
      url,
      file_name: file.originalname,
      file_type: file.mimetype,
      path,
    };
  }

  async create(taskId: string, userId: string, dto: CreateFileDto) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('files')
      .insert({
        ...dto,
        task_id: taskId,
        user_id: userId,
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

    const { data, error } = await client
      .from('files')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async remove(fileId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('files')
      .delete()
      .eq('id', fileId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Dosya bulunamadı.');
    }

    return { message: 'Dosya başarıyla silindi.' };
  }
}
