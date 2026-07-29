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
}

@immutable
class AuthState {
  const AuthState({
    required this.status,
    this.token,
    this.userId,
    this.isSubmitting = false,
    this.errorMessage,
  });

  const AuthState.unknown()
      : status = AuthStatus.unknown,
        token = null,
        userId = null,
        isSubmitting = false,
        errorMessage = null;

  const AuthState.authenticated({
    required String this.token,
    this.userId,
  })  : status = AuthStatus.authenticated,
        isSubmitting = false,
        errorMessage = null;

  const AuthState.unauthenticated({this.errorMessage})
      : status = AuthStatus.unauthenticated,
        token = null,
        userId = null,
        isSubmitting = false;

  final AuthStatus status;
  final String? token;
  final String? userId;
  final bool isSubmitting;
  final String? errorMessage;

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
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier({
    required this.repository,
    required this.secureStorage,
  }) : super(const AuthState.unknown()) {
    _bootstrap();
  }

  final AuthRepository repository;
  final FlutterSecureStorage secureStorage;

  Future<void> _bootstrap() async {
    final token = await secureStorage.read(key: StorageKeys.accessToken);
    if (token != null && token.isNotEmpty) {
      var userId = await secureStorage.read(key: StorageKeys.userId);
      userId ??= userIdFromJwt(token);
      if (userId != null) {
        await secureStorage.write(key: StorageKeys.userId, value: userId);
      }
      state = AuthState.authenticated(token: token, userId: userId);
    } else {
      state = const AuthState.unauthenticated();
    }
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
        errorMessage: 'Giriş sırasında beklenmeyen bir hata oluştu.',
      );
      return false;
    }
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
  return AuthNotifier(
    repository: ref.watch(authRepositoryProvider),
    secureStorage: ref.watch(secureStorageProvider),
  );
});
