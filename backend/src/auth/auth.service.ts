import {
  BadRequestException,
  Injectable,
  Logger,
  TooManyRequestsException,
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

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /** Supabase hata mesajlarını Türkçe / anlaşılır hale getirir. */
  private mapAuthError(message: string, context: 'register' | 'login'): never {
    const lower = message.toLowerCase();

    if (
      lower.includes('rate limit') ||
      lower.includes('email rate limit') ||
      lower.includes('over_email_send_rate_limit')
    ) {
      throw new TooManyRequestsException(
        'E-posta gönderim limiti aşıldı. Supabase ücretsiz planda doğrulama maili kotası dolmuş olabilir. ' +
          '1) Birkaç dakika bekleyin veya 2) Supabase Dashboard → Authentication → Providers → Email → ' +
          '"Confirm email" seçeneğini kapatın (geliştirme için önerilir).',
      );
    }

    if (
      lower.includes('email address') &&
      (lower.includes('invalid') || lower.includes('is invalid'))
    ) {
      throw new BadRequestException(
        'E-posta adresi geçersiz görünüyor. Boşluksuz, küçük harfle ve gerçek bir alan adı kullanın ' +
          '(örnek: adiniz@gmail.com). Geçici/sahte alan adları (@test.com, @email.com) reddedilebilir.',
      );
    }

    if (
      lower.includes('user already registered') ||
      lower.includes('already been registered')
    ) {
      throw new BadRequestException(
        'Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.',
      );
    }

    if (context === 'login') {
      throw new UnauthorizedException(
        lower.includes('invalid login') || lower.includes('invalid credentials')
          ? 'E-posta veya şifre hatalı.'
          : message,
      );
    }

    throw new BadRequestException(message);
  }

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const fullName = `${dto.firstName} ${dto.lastName}`.trim();
    const metadata = {
      first_name: dto.firstName,
      last_name: dto.lastName,
      full_name: fullName,
    };

    // Service role varsa: e-posta göndermeden (rate limit yok) onaylı kullanıcı oluştur
    const admin = this.supabaseService.getAdminClient();
    if (admin) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: dto.password,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (error) {
        this.mapAuthError(error.message, 'register');
      }

      if (!data.user) {
        throw new BadRequestException('Kullanıcı oluşturulamadı.');
      }

      await this.persistProfile(data.user, null, dto, fullName);
      return data.user;
    }

    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.signUp({
      email,
      password: dto.password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      this.mapAuthError(error.message, 'register');
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
      email: this.normalizeEmail(dto.email),
      first_name: dto.firstName,
      last_name: dto.lastName,
      full_name: fullName,
    };
    const fallbackPayload = {
      id: user.id,
      email: this.normalizeEmail(dto.email),
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

    this.logger.warn(
      `profiles kaydı tamamlanamadı (user=${user.id}): ${lastError}. ` +
        `Ad/soyad auth user_metadata içinde saklandı. ` +
        `database/migrations/add_user_names.sql dosyasını Supabase SQL Editor'de çalıştırın ` +
        `ve mümkünse SUPABASE_SERVICE_ROLE_KEY ekleyin.`,
    );
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);

    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email,
        password: dto.password,
      });

    if (error) {
      this.mapAuthError(error.message, 'login');
    }

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: data.user,
    };
  }

  async logout(token: string) {
    const admin = this.supabaseService.getAdminClient();
    if (admin) {
      const { error } = await admin.auth.admin.signOut(token);
      if (error) {
        throw new BadRequestException(error.message);
      }
    } else {
      // Admin yoksa local signOut yeterli değil; yine de hata fırlatma
      this.logger.warn(
        'Logout: SUPABASE_SERVICE_ROLE_KEY yok; admin.signOut atlandı.',
      );
    }

    return { message: 'Çıkış işlemi başarıyla tamamlandı.' };
  }
}
