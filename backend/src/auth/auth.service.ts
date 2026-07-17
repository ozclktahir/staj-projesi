import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async register(dto: RegisterDto) {
    const client = this.supabaseService.getClient();
    const fullName = `${dto.firstName} ${dto.lastName}`.trim();

    const { data, error } = await client.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: {
          first_name: dto.firstName,
          last_name: dto.lastName,
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data.user) {
      throw new BadRequestException('Kullanıcı oluşturulamadı.');
    }

    await this.persistProfile(data.user, data.session, dto, fullName);

    return data.user;
  }

  /**
   * Ad/soyadı profiles tablosuna yazar.
   * Öncelik: service role → kullanıcı oturumu → anon (RLS başarısız olabilir).
   * first_name/last_name sütunları yoksa full_name ile devam eder.
   */
  private async persistProfile(
    user: User,
    session: Session | null,
    dto: RegisterDto,
    fullName: string,
  ) {
    const fullPayload = {
      id: user.id,
      email: dto.email,
      first_name: dto.firstName,
      last_name: dto.lastName,
      full_name: fullName,
    };
    const fallbackPayload = {
      id: user.id,
      email: dto.email,
      full_name: fullName,
    };

    const writeClients = [
      this.supabaseService.getAdminClient(),
      session?.access_token
        ? this.supabaseService.createUserClient(session.access_token)
        : null,
      this.supabaseService.getClient(),
    ].filter(Boolean);

    let lastError: string | null = null;

    for (const writeClient of writeClients) {
      let { error: profileError } = await writeClient!
        .from('profiles')
        .upsert(fullPayload);

      if (
        profileError &&
        (profileError.message.includes('first_name') ||
          profileError.message.includes('last_name') ||
          profileError.code === 'PGRST204')
      ) {
        ({ error: profileError } = await writeClient!
          .from('profiles')
          .upsert(fallbackPayload));
      }

      if (!profileError) {
        return;
      }

      lastError = profileError.message;
    }

    // Auth kaydı ve user_metadata başarılı; profiles RLS/şema sorunu kaydı bozmasın
    this.logger.warn(
      `profiles kaydı tamamlanamadı (user=${user.id}): ${lastError}. ` +
        `Ad/soyad auth user_metadata içinde saklandı. ` +
        `database/migrations/add_user_names.sql dosyasını Supabase SQL Editor'de çalıştırın ` +
        `ve mümkünse SUPABASE_SERVICE_ROLE_KEY ekleyin.`,
    );
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      access_token: data.session?.access_token,
      user: data.user,
    };
  }

  async logout(token: string) {
    const { error } = await this.supabaseService
      .getClient()
      .auth.admin.signOut(token);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Çıkış işlemi başarıyla tamamlandı.' };
  }
}
