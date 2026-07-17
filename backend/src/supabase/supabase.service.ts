import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;
  private adminClient: SupabaseClient | null = null;
  private supabaseUrl: string | null = null;
  private supabaseAnonKey: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'SUPABASE_URL veya SUPABASE_KEY tanımlı değil. Supabase istemcisi başlatılamadı; lütfen .env dosyanızı kontrol edin.',
      );
      return;
    }

    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseKey;
    this.client = createClient(supabaseUrl, supabaseKey);
    this.logger.log('Supabase istemcisi başarıyla başlatıldı.');

    if (serviceRoleKey) {
      this.adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      this.logger.log('Supabase admin (service role) istemcisi başlatıldı.');
    } else {
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY tanımlı değil. profiles yazımları RLS nedeniyle başarısız olabilir.',
      );
    }
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(
        'Supabase istemcisi başlatılmamış. SUPABASE_URL ve SUPABASE_KEY ortam değişkenlerini kontrol edin.',
      );
    }
    return this.client;
  }

  /** RLS’yi bypass eder; yalnızca sunucu tarafı güvenli işlemler için. */
  getAdminClient(): SupabaseClient | null {
    return this.adminClient;
  }

  /** Yeni kullanıcının JWT’si ile RLS’ye uygun istemci üretir. */
  createUserClient(accessToken: string): SupabaseClient {
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error('Supabase istemcisi başlatılmamış.');
    }

    return createClient(this.supabaseUrl, this.supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });
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
