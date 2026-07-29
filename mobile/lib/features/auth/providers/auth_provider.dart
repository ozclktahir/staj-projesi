import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/constants/storage_keys.dart';
import '../../../core/network/api_client_provider.dart';
import '../../../core/storage/secure_storage_provider.dart';
import '../data/auth_repository.dart';
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
    this.isSubmitting = false,
    this.errorMessage,
  });

  const AuthState.unknown()
      : status = AuthStatus.unknown,
        token = null,
        isSubmitting = false,
        errorMessage = null;

  const AuthState.authenticated(String this.token)
      : status = AuthStatus.authenticated,
        isSubmitting = false,
        errorMessage = null;

  const AuthState.unauthenticated({this.errorMessage})
      : status = AuthStatus.unauthenticated,
        token = null,
        isSubmitting = false;

  final AuthStatus status;
  final String? token;
  final bool isSubmitting;
  final String? errorMessage;

  bool get isAuthenticated => status == AuthStatus.authenticated;

  AuthState copyWith({
    AuthStatus? status,
    String? token,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    bool clearToken = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      token: clearToken ? null : (token ?? this.token),
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
      state = AuthState.authenticated(token);
    } else {
      state = const AuthState.unauthenticated();
    }
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final token = await repository.login(
        LoginDto(email: email, password: password),
      );
      await secureStorage.write(
        key: StorageKeys.accessToken,
        value: token,
      );
      state = AuthState.authenticated(token);
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
      final token = await repository.register(
        RegisterDto(
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
        ),
      );
      await secureStorage.write(
        key: StorageKeys.accessToken,
        value: token,
      );
      state = AuthState.authenticated(token);
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
      state = const AuthState.unauthenticated();
    }
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
