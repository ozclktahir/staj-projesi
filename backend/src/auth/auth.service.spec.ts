import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { MailService } from '../mail/mail.service';
import { SupabaseService } from '../supabase/supabase.service';

type TotpFactor = { status: string };

function buildEphemeralClient(overrides: {
  signInError?: { message: string } | null;
  session?: { access_token: string; refresh_token: string | null };
  user?: { id: string; email: string };
  totpFactors?: TotpFactor[];
}) {
  const session = overrides.session ?? {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
  };
  const user = overrides.user ?? { id: 'u-1', email: 'user@example.com' };

  return {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue(
        overrides.signInError
          ? { data: { session: null, user: null }, error: overrides.signInError }
          : { data: { session, user }, error: null },
      ),
      mfa: {
        listFactors: jest.fn().mockResolvedValue({
          data: { totp: overrides.totpFactors ?? [] },
          error: null,
        }),
      },
    },
  };
}

describe('AuthService — Login OTP (e-posta ile giriş onayı)', () => {
  let service: AuthService;
  let supabaseService: { createEphemeralClient: jest.Mock; getAdminClient: jest.Mock; getClient: jest.Mock };
  let mailService: { enabled: boolean; sendLoginOtpEmail: jest.Mock; sendEmailConfirmationLink: jest.Mock; send: jest.Mock };
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  async function build(
    clientOverrides: Parameters<typeof buildEphemeralClient>[0] = {},
  ) {
    const client = buildEphemeralClient(clientOverrides);
    supabaseService = {
      createEphemeralClient: jest.fn(() => client),
      getAdminClient: jest.fn(() => null),
      getClient: jest.fn(() => client),
    };
    mailService = {
      enabled: true,
      sendLoginOtpEmail: jest.fn().mockResolvedValue(undefined),
      sendEmailConfirmationLink: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
    };
    cacheManager = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: MailService, useValue: mailService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  }

  describe('login() dallanması (TOTP vs e-posta OTP)', () => {
    it('doğrulanmış TOTP faktörü varsa oturumu doğrudan döner (mevcut davranış değişmez)', async () => {
      await build({ totpFactors: [{ status: 'verified' }] });

      const result = await service.login({
        email: 'user@example.com',
        password: 'sifre123',
      });

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: { id: 'u-1', email: 'user@example.com' },
      });
      expect(mailService.sendLoginOtpEmail).not.toHaveBeenCalled();
    });

    it('TOTP aktif değilse tokenları DÖNMEZ, e-posta OTP akışını başlatır', async () => {
      await build({ totpFactors: [] });

      const result = await service.login({
        email: 'user@example.com',
        password: 'sifre123',
      });

      expect(result).toEqual({
        otp_required: true,
        user_id: 'u-1',
        message: expect.any(String),
      });
      expect(mailService.sendLoginOtpEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        'login_otp:u-1',
        expect.any(String),
        5 * 60 * 1000,
      );
    });

    it('şifre hatalıysa UnauthorizedException fırlatır', async () => {
      await build({ signInError: { message: 'Invalid login credentials' } });

      await expect(
        service.login({ email: 'user@example.com', password: 'yanlis' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("Supabase 'Email not confirmed' hatasını Türkçe mesaja çevirir", async () => {
      await build({ signInError: { message: 'Email not confirmed' } });

      await expect(
        service.login({ email: 'user@example.com', password: 'sifre123' }),
      ).rejects.toThrow('Lütfen önce e-postanıza gelen onay linkine tıklayın.');
    });
  });

  describe('requestLoginOtp()', () => {
    it('TOTP aktifse BadRequestException fırlatır (bu uç yalnızca e-posta OTP içindir)', async () => {
      await build({ totpFactors: [{ status: 'verified' }] });

      await expect(
        service.requestLoginOtp({
          email: 'user@example.com',
          password: 'sifre123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mailService.sendLoginOtpEmail).not.toHaveBeenCalled();
    });

    it('60 saniyelik cooldown içinde tekrar istenirse 429 (rate limit) döner', async () => {
      await build({ totpFactors: [] });
      cacheManager.get.mockResolvedValueOnce(Date.now() + 30_000);

      await expect(
        service.requestLoginOtp({
          email: 'user@example.com',
          password: 'sifre123',
        }),
      ).rejects.toThrow(/saniye sonra tekrar deneyin/);
      expect(mailService.sendLoginOtpEmail).not.toHaveBeenCalled();
    });

    it('başarılı istekte kod üretir, Redis’e yazar ve e-posta gönderir', async () => {
      await build({ totpFactors: [] });

      const result = await service.requestLoginOtp({
        email: 'user@example.com',
        password: 'sifre123',
      });

      expect(result).toEqual({
        otp_required: true,
        user_id: 'u-1',
        message: expect.any(String),
      });
      expect(cacheManager.set).toHaveBeenCalledTimes(2);
      expect(mailService.sendLoginOtpEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyLoginOtp()', () => {
    it('doğru kodla tokenları döner ve Redis kaydını siler', async () => {
      await build();
      cacheManager.get.mockResolvedValueOnce(
        JSON.stringify({
          code: '123456',
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          user: { id: 'u-1', email: 'user@example.com' },
        }),
      );

      const result = await service.verifyLoginOtp({
        user_id: 'u-1',
        code: '123456',
      });

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: { id: 'u-1', email: 'user@example.com' },
      });
      expect(cacheManager.del).toHaveBeenCalledWith('login_otp:u-1');
    });

    it('kod yanlışsa UnauthorizedException fırlatır', async () => {
      await build();
      cacheManager.get.mockResolvedValueOnce(
        JSON.stringify({
          code: '123456',
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          user: { id: 'u-1', email: 'user@example.com' },
        }),
      );

      await expect(
        service.verifyLoginOtp({ user_id: 'u-1', code: '000000' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('kod süresi dolmuşsa (Redis’te kayıt yoksa) UnauthorizedException fırlatır', async () => {
      await build();
      cacheManager.get.mockResolvedValueOnce(undefined);

      await expect(
        service.verifyLoginOtp({ user_id: 'u-1', code: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
