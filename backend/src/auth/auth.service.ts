import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Session, User } from '@supabase/supabase-js';
import { MailService } from '../mail/mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /** FRONTEND_URL tanımlıysa onay linki tıklandıktan sonra oraya yönlendirir. */
  private confirmRedirectUrl(): string | undefined {
    const base = process.env.FRONTEND_URL?.trim();
    return base ? `${base.replace(/\/+$/, '')}/login` : undefined;
  }

  /** Supabase hata mesajlarını Türkçe / anlaşılır hale getirir. */
  private mapAuthError(message: string, context: 'register' | 'login'): never {
    const lower = message.toLowerCase();

    if (
      lower.includes('rate limit') ||
      lower.includes('email rate limit') ||
      lower.includes('over_email_send_rate_limit')
    ) {
      throw new HttpException(
        'E-posta gönderim limiti aşıldı. Supabase ücretsiz planda doğrulama maili kotası dolmuş olabilir. ' +
          '1) Birkaç dakika bekleyin veya 2) Supabase Dashboard → Authentication → Providers → Email → ' +
          '"Confirm email" seçeneğini kapatın (geliştirme için önerilir).',
        HttpStatus.TOO_MANY_REQUESTS,
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
      if (lower.includes('email not confirmed')) {
        throw new UnauthorizedException(
          'Lütfen önce e-postanıza gelen onay linkine tıklayın.',
        );
      }
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
    const fullName =
      `${dto.firstName} ${dto.lastName}`.trim() ||
      email.split('@')[0] ||
      email;
    const metadata = {
      first_name: dto.firstName,
      last_name: dto.lastName,
      full_name: fullName,
    };

    const admin = this.supabaseService.getAdminClient();
    if (admin) {
      // Gerçek e-posta onayı: yalnızca SMTP yapılandırılıysa zorunlu kılınır.
      // generateLink() kullanıcıyı ONAYSIZ oluşturur ve bize bir action_link
      // döner; linki kendi MailService'imizle gönderiyoruz (Supabase'in kendi
      // mailer'ının rate limitine takılmadan — bkz. mapAuthError'daki not).
      // SMTP yoksa link hiçbir zaman teslim edilemez ve hesap sonsuza dek
      // giriş yapılamaz kalır; bu yüzden SMTP kapalıyken bilinçli olarak eski
      // (otomatik onaylı) davranışa düşülür — bkz. CLAUDE.md.
      if (this.mailService.enabled) {
        const { data, error } = await admin.auth.admin.generateLink({
          type: 'signup',
          email,
          password: dto.password,
          options: {
            data: metadata,
            redirectTo: this.confirmRedirectUrl(),
          },
        });

        if (error) {
          this.mapAuthError(error.message, 'register');
        }

        if (!data.user) {
          throw new BadRequestException('Kullanıcı oluşturulamadı.');
        }

        await this.persistProfile(data.user, null, dto, fullName);
        await this.mailService.sendEmailConfirmationLink(
          email,
          data.properties.action_link,
        );
        return data.user;
      }

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

  /**
   * Şifreyi doğrular. Paylaşılan singleton yerine taze bir ephemeral istemci
   * kullanır (signInWithPassword da setSession gibi client'ın dahili oturum
   * durumunu değiştirir — bkz. SupabaseService.createEphemeralClient dokümanı).
   */
  private async passwordSignIn(email: string, password: string) {
    const client = this.supabaseService.createEphemeralClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: this.normalizeEmail(email),
      password,
    });

    if (error) {
      this.mapAuthError(error.message, 'login');
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedException('Giriş başarısız. Lütfen tekrar deneyin.');
    }

    return { client, session: data.session, user: data.user };
  }

  async login(dto: LoginDto) {
    const { session, user } = await this.passwordSignIn(
      dto.email,
      dto.password,
    );

    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user,
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

  /** Access token yenileme — Supabase refreshSession. */
  async refresh(refreshToken: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session?.access_token) {
      throw new UnauthorizedException(
        error?.message || 'Oturum yenilenemedi. Lütfen tekrar giriş yapın.',
      );
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user ?? data.session.user,
    };
  }
}
