import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/constants/storage_keys.dart';
import '../../../core/network/api_client_provider.dart';
import '../../../core/storage/secure_storage_provider.dart';
import '../data/auth_repository.dart';
import '../data/jwt_utils.dart';
import '../data/login_dto.dart';
import '../data/register_dto.dart';

enum AuthStatus {
  unknown,
  authenticated,
  unauthenticated,
  // Şifre doğru ama hesapta MFA (TOTP) açık — TOTP kodu bekleniyor.
  // Web'deki LoginPage'in yerel `mfaPending` state'iyle aynı adım.
  mfaPending,
  // Şifre doğru, TOTP aktif DEĞİL — e-postaya gönderilen 6 haneli giriş
  // onay kodu bekleniyor. Web'deki yerel `otpPending` state'iyle aynı adım;
  // TOTP ile karşılıklı dışlayıcıdır (backend ikisini asla birlikte istemez).
  otpPending,
}

/// register()'ın üç olası sonucu — web'deki register/page.tsx'in
/// `data.access_token` var/yok dallanmasıyla aynı ayrım.
enum RegisterOutcome {
  /// Oturum doğrudan alındı, kullanıcı authenticated.
  authenticated,
  /// Kayıt başarılı ama otomatik oturum alınamadı (e-posta onayı ya da
  /// e-posta OTP bekleniyor) — kullanıcı /login'den manuel giriş yapmalı.
  needsManualLogin,
  /// Kayıt isteği başarısız oldu (errorMessage'a bakın).
  failed,
}

@immutable
class AuthState {
  const AuthState({
    required this.status,
    this.token,
    this.userId,
    this.isSubmitting = false,
    this.errorMessage,
    this.mfaAccessToken,
    this.mfaRefreshToken,
    this.otpUserId,
    this.otpEmail,
    this.otpPassword,
  });

  const AuthState.unknown()
      : status = AuthStatus.unknown,
        token = null,
        userId = null,
        isSubmitting = false,
        errorMessage = null,
        mfaAccessToken = null,
        mfaRefreshToken = null,
        otpUserId = null,
        otpEmail = null,
        otpPassword = null;

  const AuthState.authenticated({
    required String this.token,
    this.userId,
  })  : status = AuthStatus.authenticated,
        isSubmitting = false,
        errorMessage = null,
        mfaAccessToken = null,
        mfaRefreshToken = null,
        otpUserId = null,
        otpEmail = null,
        otpPassword = null;

  const AuthState.unauthenticated({this.errorMessage})
      : status = AuthStatus.unauthenticated,
        token = null,
        userId = null,
        isSubmitting = false,
        mfaAccessToken = null,
        mfaRefreshToken = null,
        otpUserId = null,
        otpEmail = null,
        otpPassword = null;

  /// Şifre doğrulandı, TOTP kodu bekleniyor. `mfaAccessToken`/`mfaRefreshToken`
  /// Supabase'in verdiği AAL1 (geçici) oturumu — verify başarılı olunca
  /// gerçek (AAL2) oturumla değiştirilir, o ana kadar kalıcı depoya yazılmaz.
  const AuthState.mfaPending({
    required String this.mfaAccessToken,
    this.mfaRefreshToken,
    this.userId,
  })  : status = AuthStatus.mfaPending,
        token = null,
        isSubmitting = false,
        errorMessage = null,
        otpUserId = null,
        otpEmail = null,
        otpPassword = null;

  /// Şifre doğrulandı, TOTP aktif değil — e-postaya gönderilen kod
  /// bekleniyor. `otpEmail`/`otpPassword`, "kodu tekrar gönder" ucu
  /// (`/auth/login/request-otp`) şifreyi yeniden doğruladığı için saklanır
  /// (web'deki `EmailOtpChallengeCard`'ın aynı ihtiyacı).
  const AuthState.otpPending({
    required String this.otpUserId,
    required String this.otpEmail,
    required String this.otpPassword,
  })  : status = AuthStatus.otpPending,
        token = null,
        userId = null,
        isSubmitting = false,
        errorMessage = null,
        mfaAccessToken = null,
        mfaRefreshToken = null;

  final AuthStatus status;
  final String? token;
  final String? userId;
  final bool isSubmitting;
  final String? errorMessage;
  final String? mfaAccessToken;
  final String? mfaRefreshToken;
  final String? otpUserId;
  final String? otpEmail;
  final String? otpPassword;

  bool get isAuthenticated => status == AuthStatus.authenticated;

  AuthState copyWith({
    AuthStatus? status,
    String? token,
    String? userId,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    bool clearToken = false,
    bool clearUserId = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      token: clearToken ? null : (token ?? this.token),
      userId: clearUserId ? null : (userId ?? this.userId),
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      mfaAccessToken: mfaAccessToken,
      mfaRefreshToken: mfaRefreshToken,
      otpUserId: otpUserId,
      otpEmail: otpEmail,
      otpPassword: otpPassword,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier({
    required this.repository,
    required this.secureStorage,
    required this.onTokensUpdated,
  }) : super(const AuthState.unknown()) {
    _bootstrap();
  }

  final AuthRepository repository;
  final FlutterSecureStorage secureStorage;
  final void Function(String? access, String? refresh) onTokensUpdated;

  Future<void> _bootstrap() async {
    final token = await secureStorage.read(key: StorageKeys.accessToken);
    final refresh = await secureStorage.read(key: StorageKeys.refreshToken);

    if (token != null && token.isNotEmpty && !isJwtExpired(token)) {
      var userId = await secureStorage.read(key: StorageKeys.userId);
      userId ??= userIdFromJwt(token);
      if (userId != null) {
        await secureStorage.write(key: StorageKeys.userId, value: userId);
      }
      onTokensUpdated(token, refresh);
      state = AuthState.authenticated(token: token, userId: userId);
      return;
    }

    // Access dolmuşsa refresh ile sessiz yenile.
    if (refresh != null && refresh.isNotEmpty) {
      try {
        final session = await repository.refresh(refresh);
        await _persistSession(session);
        state = AuthState.authenticated(
          token: session.accessToken,
          userId: session.userId,
        );
        return;
      } catch (_) {
        // Aşağıda temizle.
      }
    }

    await secureStorage.delete(key: StorageKeys.accessToken);
    await secureStorage.delete(key: StorageKeys.refreshToken);
    await secureStorage.delete(key: StorageKeys.userId);
    onTokensUpdated(null, null);
    state = const AuthState.unauthenticated();
  }

  Future<void> _persistSession(AuthSession session) async {
    await secureStorage.write(
      key: StorageKeys.accessToken,
      value: session.accessToken,
    );
    if (session.refreshToken != null) {
      await secureStorage.write(
        key: StorageKeys.refreshToken,
        value: session.refreshToken,
      );
    }
    if (session.userId != null) {
      await secureStorage.write(
        key: StorageKeys.userId,
        value: session.userId,
      );
    }
    onTokensUpdated(session.accessToken, session.refreshToken);
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final result = await repository.login(
        LoginDto(email: email, password: password),
      );

      // TOTP aktif değilse backend session yerine e-posta OTP ister —
      // web'deki `onSubmit`'in `data.otp_required` dalıyla aynı kontrol.
      if (result.isOtpRequired) {
        state = AuthState.otpPending(
          otpUserId: result.otpUserId!,
          otpEmail: email,
          otpPassword: password,
        );
        return false;
      }

      final session = result.session!;

      // Web'deki needsMfaChallenge() ile aynı kontrol: hesapta doğrulanmış
      // bir TOTP faktörü varsa AAL1 oturumu tek başına yeterli değildir.
      if (session.refreshToken != null && session.refreshToken!.isNotEmpty) {
        try {
          // Geçici (AAL1) token'ı belleğe koy — mfaStatus isteği bunu kullanır.
          onTokensUpdated(session.accessToken, session.refreshToken);
          final mfa = await repository.mfaStatus(session.refreshToken!);
          if (mfa.needsChallenge) {
            state = AuthState.mfaPending(
              mfaAccessToken: session.accessToken,
              mfaRefreshToken: session.refreshToken,
              userId: session.userId,
            );
            return false;
          }
        } on AuthException {
          // MFA durumu sorgulanamadıysa girişi bloklama — normal akışa devam.
        }
      }

      await _persistSession(session);
      state = AuthState.authenticated(
        token: session.accessToken,
        userId: session.userId,
      );
      return true;
    } on AuthException catch (error) {
      onTokensUpdated(null, null);
      state = AuthState.unauthenticated(errorMessage: error.message);
      return false;
    } catch (_) {
      onTokensUpdated(null, null);
      state = const AuthState.unauthenticated(
        errorMessage: 'Giriş sırasında beklenmeyen bir hata oluştu.',
      );
      return false;
    }
  }

  /// MFA ekranında girilen TOTP kodunu doğrular; başarılıysa AAL2 oturumunu
  /// kalıcı depoya yazıp kullanıcıyı authenticated yapar.
  Future<bool> submitMfaCode(String code) async {
    if (state.status != AuthStatus.mfaPending) return false;
    final refreshToken = state.mfaRefreshToken;
    if (refreshToken == null || refreshToken.isEmpty) {
      state = const AuthState.unauthenticated(
        errorMessage: 'Oturum bilgisi eksik. Lütfen tekrar giriş yapın.',
      );
      return false;
    }

    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final challenge = await repository.mfaChallenge(refreshToken);
      final session = await repository.mfaVerify(
        refreshToken: refreshToken,
        factorId: challenge.factorId,
        challengeId: challenge.challengeId,
        code: code,
      );
      await _persistSession(session);
      state = AuthState.authenticated(
        token: session.accessToken,
        userId: session.userId,
      );
      return true;
    } on AuthException catch (error) {
      state = state.copyWith(isSubmitting: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Doğrulama sırasında beklenmeyen bir hata oluştu.',
      );
      return false;
    }
  }

  /// MFA ekranından "vazgeç" — geçici oturumu tamamen temizler.
  void cancelMfaChallenge() {
    onTokensUpdated(null, null);
    state = const AuthState.unauthenticated();
  }

  /// E-posta OTP ekranında girilen kodu doğrular; başarılıysa oturumu
  /// kalıcı depoya yazıp kullanıcıyı authenticated yapar.
  Future<bool> submitEmailOtpCode(String code) async {
    if (state.status != AuthStatus.otpPending) return false;
    final userId = state.otpUserId;
    if (userId == null || userId.isEmpty) {
      state = const AuthState.unauthenticated(
        errorMessage: 'Oturum bilgisi eksik. Lütfen tekrar giriş yapın.',
      );
      return false;
    }

    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final session = await repository.verifyLoginOtp(
        userId: userId,
        code: code,
      );
      await _persistSession(session);
      state = AuthState.authenticated(
        token: session.accessToken,
        userId: session.userId,
      );
      return true;
    } on AuthException catch (error) {
      state = state.copyWith(isSubmitting: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Doğrulama sırasında beklenmeyen bir hata oluştu.',
      );
      return false;
    }
  }

  /// "Kodu tekrar gönder" — 60 saniyelik cooldown backend'de uygulanıyor
  /// (429 döner), burada yalnızca isteği iletip yeni user_id'yi saklarız.
  Future<bool> resendEmailOtp() async {
    if (state.status != AuthStatus.otpPending) return false;
    final email = state.otpEmail;
    final password = state.otpPassword;
    final currentOtpUserId = state.otpUserId;
    if (email == null || password == null || currentOtpUserId == null) {
      return false;
    }

    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final result = await repository.requestLoginOtp(
        email: email,
        password: password,
      );
      state = AuthState.otpPending(
        otpUserId: result.otpUserId ?? currentOtpUserId,
        otpEmail: email,
        otpPassword: password,
      );
      return true;
    } on AuthException catch (error) {
      state = state.copyWith(isSubmitting: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Kod tekrar gönderilemedi.',
      );
      return false;
    }
  }

  /// OTP ekranından "vazgeç" — geçici oturumu tamamen temizler.
  void cancelEmailOtpChallenge() {
    onTokensUpdated(null, null);
    state = const AuthState.unauthenticated();
  }

  Future<RegisterOutcome> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final result = await repository.register(
        RegisterDto(
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
        ),
      );

      if (result.session == null) {
        // Kayıt oluştu ama otomatik oturum alınamadı (e-posta onayı ya da
        // e-posta OTP bekleniyor) — web'deki register/page.tsx'in
        // `!data.access_token` dalıyla aynı düşüş: kullanıcı /login'den
        // manuel giriş yapmalı.
        state = const AuthState.unauthenticated();
        return RegisterOutcome.needsManualLogin;
      }

      final session = result.session!;
      await _persistSession(session);
      state = AuthState.authenticated(
        token: session.accessToken,
        userId: session.userId,
      );
      return RegisterOutcome.authenticated;
    } on AuthException catch (error) {
      state = AuthState.unauthenticated(errorMessage: error.message);
      return RegisterOutcome.failed;
    } catch (_) {
      state = const AuthState.unauthenticated(
        errorMessage: 'Kayıt sırasında beklenmeyen bir hata oluştu.',
      );
      return RegisterOutcome.failed;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      await repository.logout();
    } finally {
      await secureStorage.delete(key: StorageKeys.accessToken);
      await secureStorage.delete(key: StorageKeys.refreshToken);
      await secureStorage.delete(key: StorageKeys.userId);
      state = const AuthState.unauthenticated();
    }
  }

  /// 401 sonrası: API çağrısı yapmadan yerel oturumu temizler → router /login.
  Future<void> clearSessionLocally() async {
    await secureStorage.delete(key: StorageKeys.accessToken);
    await secureStorage.delete(key: StorageKeys.refreshToken);
    await secureStorage.delete(key: StorageKeys.userId);
    state = const AuthState.unauthenticated(
      errorMessage: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
    );
  }

  void clearError() {
    if (state.errorMessage != null) {
      state = state.copyWith(clearError: true);
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(apiClient: ref.watch(apiClientProvider));
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final api = ref.watch(apiClientProvider);
  return AuthNotifier(
    repository: ref.watch(authRepositoryProvider),
    secureStorage: ref.watch(secureStorageProvider),
    onTokensUpdated: (access, refresh) {
      api.updateAccessToken(access);
      api.updateRefreshToken(refresh);
    },
  );
});
