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
  });

  const AuthState.unknown()
      : status = AuthStatus.unknown,
        token = null,
        userId = null,
        isSubmitting = false,
        errorMessage = null,
        mfaAccessToken = null,
        mfaRefreshToken = null;

  const AuthState.authenticated({
    required String this.token,
    this.userId,
  })  : status = AuthStatus.authenticated,
        isSubmitting = false,
        errorMessage = null,
        mfaAccessToken = null,
        mfaRefreshToken = null;

  const AuthState.unauthenticated({this.errorMessage})
      : status = AuthStatus.unauthenticated,
        token = null,
        userId = null,
        isSubmitting = false,
        mfaAccessToken = null,
        mfaRefreshToken = null;

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
        errorMessage = null;

  final AuthStatus status;
  final String? token;
  final String? userId;
  final bool isSubmitting;
  final String? errorMessage;
  final String? mfaAccessToken;
  final String? mfaRefreshToken;

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
      final session = await repository.login(
        LoginDto(email: email, password: password),
      );

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

  Future<bool> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final session = await repository.register(
        RegisterDto(
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
        ),
      );
      await _persistSession(session);
      state = AuthState.authenticated(
        token: session.accessToken,
        userId: session.userId,
      );
      return true;
    } on AuthException catch (error) {
      state = AuthState.unauthenticated(errorMessage: error.message);
      return false;
    } catch (_) {
      state = const AuthState.unauthenticated(
        errorMessage: 'Kayıt sırasında beklenmeyen bir hata oluştu.',
      );
      return false;
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
