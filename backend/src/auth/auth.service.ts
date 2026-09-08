import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Cache } from 'cache-manager';
import { randomInt } from 'crypto';
import { MailService } from '../mail/mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RequestLoginOtpDto, VerifyLoginOtpDto } from './dto/login-otp.dto';
import { RegisterDto } from './dto/register.dto';

/** Login OTP — kod + oturum 5 dakika Redis'te tutulur, doğrulanınca silinir. */
const LOGIN_OTP_TTL_MS = 5 * 60 * 1000;
/** Aynı kullanıcı için art arda kod isteme (spam/brute-force) koruması. */
const LOGIN_OTP_COOLDOWN_MS = 60 * 1000;

type LoginOtpPayload = {
  code: string;
  access_token: string;
  refresh_token: string | null;
  user: User;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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

  /** Hesapta doğrulanmış bir TOTP faktörü var mı? (varsa e-posta OTP'ye gerek yok) */
  private async hasVerifiedTotp(client: SupabaseClient): Promise<boolean> {
    const { data, error } = await client.auth.mfa.listFactors();
    if (error) {
      this.logger.warn(`MFA faktörleri okunamadı: ${error.message}`);
      return false;
    }
    return (data.totp ?? []).some((factor) => factor.status === 'verified');
  }

  private generateOtpCode(): string {
    return String(randomInt(100000, 1000000));
  }

  /**
   * Login OTP kodu üretir, Redis'e (session ile birlikte) yazar ve e-posta
   * gönderir. `session`, signInWithPassword'dan zaten elde edilmiş olmalı —
   * verifyLoginOtp() bu tokenları AYNEN geri döner (token üretim mantığını
   * tekrar etmez).
   */
  private async issueLoginOtp(user: User, session: Session) {
    if (!user.email) {
      throw new BadRequestException('Kullanıcının e-posta adresi bulunamadı.');
    }

    const cooldownKey = `login_otp_cooldown:${user.id}`;
    const cooldownUntil = await this.cacheManager.get<number>(cooldownKey);
    if (cooldownUntil && cooldownUntil > Date.now()) {
      const remaining = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
      throw new HttpException(
        `Çok sık kod istediniz. ${remaining} saniye sonra tekrar deneyin.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.generateOtpCode();
    const payload: LoginOtpPayload = {
      code,
      access_token: session.access_token,
      refresh_token: session.refresh_token ?? null,
      user,
    };

    await this.cacheManager.set(
      `login_otp:${user.id}`,
      JSON.stringify(payload),
      LOGIN_OTP_TTL_MS,
    );
    await this.cacheManager.set(
      cooldownKey,
      Date.now() + LOGIN_OTP_COOLDOWN_MS,
      LOGIN_OTP_COOLDOWN_MS,
    );

    await this.mailService.sendLoginOtpEmail(user.email, code);

    return {
      otp_required: true as const,
      user_id: user.id,
      message: 'Giriş onay kodu e-postanıza gönderildi.',
    };
  }

  async login(dto: LoginDto) {
    const { client, session, user } = await this.passwordSignIn(
      dto.email,
      dto.password,
    );

    if (await this.hasVerifiedTotp(client)) {
      return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user,
      };
    }

    return this.issueLoginOtp(user, session);
  }

  /**
   * "Kodu tekrar gönder" ve login()'in e-posta-OTP dalıyla aynı akış —
   * şifreyi tekrar doğrular (taze bir session/kod üretmek için) ve TOTP aktif
   * bir hesap için çağrılırsa reddeder (bu uç yalnızca e-posta OTP akışı içindir).
   */
  async requestLoginOtp(dto: RequestLoginOtpDto) {
    const { client, session, user } = await this.passwordSignIn(
      dto.email,
      dto.password,
    );

    if (await this.hasVerifiedTotp(client)) {
      throw new BadRequestException(
        'Bu hesapta authenticator uygulaması (TOTP) aktif; e-posta kodu kullanılamaz.',
      );
    }

    return this.issueLoginOtp(user, session);
  }

  /** E-postaya gönderilen kodu doğrular ve login()'de üretilmiş oturumu döner. */
  async verifyLoginOtp(dto: VerifyLoginOtpDto) {
    const key = `login_otp:${dto.user_id}`;
    const raw = await this.cacheManager.get<string>(key);

    if (!raw) {
      throw new UnauthorizedException(
        'Kod süresi doldu veya bulunamadı. Lütfen yeni bir kod isteyin.',
      );
    }

    let payload: LoginOtpPayload;
    try {
      payload = JSON.parse(raw) as LoginOtpPayload;
    } catch {
      await this.cacheManager.del(key);
      throw new UnauthorizedException(
        'Kod doğrulanamadı. Lütfen yeni bir kod isteyin.',
      );
    }

    if (payload.code !== dto.code.trim()) {
      throw new UnauthorizedException('Kod hatalı.');
    }

    await this.cacheManager.del(key);

    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      user: payload.user,
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

  /**
   * Verilen access/refresh token çiftiyle TAZE bir Supabase istemcisi kurar
   * (paylaşılan singleton ASLA kullanılmaz — bkz. SupabaseService.createEphemeralClient).
   */
  private async sessionClient(accessToken: string, refreshToken: string) {
    const client = this.supabaseService.createEphemeralClient();
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw new UnauthorizedException('Oturum doğrulanamadı: ' + error.message);
    }
    return client;
  }

  /** Web'deki needsMfaChallenge() ile aynı mantık: AAL1→AAL2 yükseltmesi gerekiyor mu? */
  async mfaStatus(accessToken: string, refreshToken: string) {
    const client = await this.sessionClient(accessToken, refreshToken);
    const { data, error } =
      await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      throw new BadRequestException(error.message);
    }
    return {
      needsChallenge:
        data.currentLevel === 'aal1' && data.nextLevel === 'aal2',
    };
  }

  /** Doğrulanmış TOTP faktörü için challenge başlatır (web'deki MfaChallengeCard.submit ile aynı akış). */
  async mfaChallenge(accessToken: string, refreshToken: string) {
    const client = await this.sessionClient(accessToken, refreshToken);

    const { data: factorsData, error: factorsError } =
      await client.auth.mfa.listFactors();
    if (factorsError) {
      throw new BadRequestException(factorsError.message);
    }

    const factor = (factorsData.totp ?? []).find(
      (f) => f.status === 'verified',
    );
    if (!factor) {
      throw new BadRequestException('Doğrulanmış bir MFA yöntemi bulunamadı.');
    }

    const { data, error } = await client.auth.mfa.challenge({
      factorId: factor.id,
    });
    if (error) {
      throw new BadRequestException(error.message);
    }

    return { factor_id: factor.id, challenge_id: data.id };
  }

  /** TOTP kodunu doğrular ve AAL2'ye yükseltilmiş yeni oturumu döner. */
  async mfaVerify(
    accessToken: string,
    refreshToken: string,
    factorId: string,
    challengeId: string,
    code: string,
  ) {
    const client = await this.sessionClient(accessToken, refreshToken);

    const { error } = await client.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });
    if (error) {
      throw new UnauthorizedException(error.message);
    }

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new UnauthorizedException('Doğrulanmış oturum alınamadı.');
    }

    return {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user: sessionData.session.user,
    };
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
