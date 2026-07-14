import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
}
