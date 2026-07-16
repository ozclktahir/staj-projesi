import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'SUPABASE_URL veya SUPABASE_KEY tanımlı değil. Supabase istemcisi başlatılamadı; lütfen .env dosyanızı kontrol edin.',
      );
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    this.logger.log('Supabase istemcisi başarıyla başlatıldı.');
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(
        'Supabase istemcisi başlatılmamış. SUPABASE_URL ve SUPABASE_KEY ortam değişkenlerini kontrol edin.',
      );
    }
    return this.client;
  }

  /**
   * 'uploads' bucket'ına dosya yükler ve oluşan public URL'i döner.
   */
  async uploadFile(file: Express.Multer.File, path: string): Promise<string> {
    const client = this.getClient();

    const { data, error } = await client.storage
      .from('uploads')
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const { data: publicUrlData } = client.storage
      .from('uploads')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }
}
