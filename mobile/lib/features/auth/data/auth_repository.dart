import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'jwt_utils.dart';
import 'login_dto.dart';
import 'register_dto.dart';

class AuthException implements Exception {
  AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AuthSession {
  const AuthSession({
    required this.accessToken,
    this.refreshToken,
    this.userId,
  });

  final String accessToken;
  final String? refreshToken;
  final String? userId;
}

/// AAL1→AAL2 yükseltmesi gerekip gerekmediği (web'deki needsMfaChallenge()).
class MfaStatusResult {
  const MfaStatusResult({required this.needsChallenge});

  final bool needsChallenge;
}

/// mfa/challenge yanıtı — verify adımında geri gönderilmesi gerekir.
class MfaChallengeResult {
  const MfaChallengeResult({
    required this.factorId,
    required this.challengeId,
  });

  final String factorId;
  final String challengeId;
}

/// `/auth/login` (ve `/auth/login/request-otp`) cevabı: ya doğrudan oturum,
/// ya da (TOTP aktif değilse) e-postaya gönderilen giriş onay kodu bekleniyor
/// — web'deki `data.otp_required` dallanmasıyla aynı ayrım.
class LoginResult {
  const LoginResult.session(this.session)
      : otpUserId = null,
        otpMessage = null;

  const LoginResult.otpRequired({required String userId, String? message})
      : session = null,
        otpUserId = userId,
        otpMessage = message;

  final AuthSession? session;
  final String? otpUserId;
  final String? otpMessage;

  bool get isOtpRequired => otpUserId != null;
}

/// Kayıt sonrası: ya doğrudan oturum alınır, ya da (e-posta onayı ya da
/// e-posta OTP nedeniyle) kullanıcı manuel giriş yapmalı — web'deki
/// register/page.tsx'teki `!data.access_token` düşüşüyle aynı.
class RegisterResult {
  const RegisterResult.session(this.session);

  const RegisterResult.needsManualLogin() : session = null;

  final AuthSession? session;
}

/// NestJS `/auth/*` uçları — JWT access_token + user id.
class AuthRepository {
  AuthRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  Future<LoginResult> login(LoginDto dto) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authLogin,
        data: dto.toJson(),
      );
      return _loginResultFromResponse(response.data);
    } on DioException catch (error) {
      throw AuthException(_messageFromDio(error));
    }
  }

  /// Şifreyi yeniden doğrular ve (TOTP aktif değilse) e-posta ile giriş onay
  /// kodu gönderir — login()'in e-posta-OTP dalıyla aynı akış, "kodu tekrar
  /// gönder" için kullanılır.
  Future<LoginResult> requestLoginOtp({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authLoginRequestOtp,
        data: {'email': email.trim().toLowerCase(), 'password': password},
      );
      return _loginResultFromResponse(response.data);
    } on DioException catch (error) {
      throw AuthException(_messageFromDio(error));
    }
  }

  /// E-postaya gönderilen kodu doğrular ve login()'de üretilmiş oturumu döner.
  Future<AuthSession> verifyLoginOtp({
    required String userId,
    required String code,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authLoginVerifyOtp,
        data: {'user_id': userId, 'code': code},
      );
      return _sessionFromResponse(response.data);
    } on DioException catch (error) {
      throw AuthException(_messageFromDio(error));
    }
  }

  /// Kayıt sonrası session dönmeyebilir; token için login yapılır.
  Future<RegisterResult> register(RegisterDto dto) async {
    try {
      final response = await _dio.post<dynamic>(
        ApiConstants.authRegister,
        data: dto.toJson(),
      );

      final token = _tryReadAccessToken(response.data);
      if (token != null) {
        return RegisterResult.session(
          AuthSession(
            accessToken: token,
            userId: _tryReadUserId(response.data) ?? userIdFromJwt(token),
            refreshToken: _tryReadRefreshToken(response.data),
          ),
        );
      }

      final loginResult = await login(
        LoginDto(email: dto.email, password: dto.password),
      );
      if (loginResult.session != null) {
        return RegisterResult.session(loginResult.session!);
      }

      // TOTP aktif değil ama e-posta OTP gerekiyor — web'deki gibi kullanıcı
      // /login ekranından manuel giriş yapmalı (otomatik oturum alınamaz).
      return const RegisterResult.needsManualLogin();
    } on DioException catch (error) {
      throw AuthException(_messageFromDio(error));
    } on AuthException {
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post<void>(ApiConstants.authLogout);
    } on DioException {
      // Yerel token yine silinecek; ağ hatası logout'u engellemez.
    }
  }

  Future<AuthSession> refresh(String refreshToken) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authRefresh,
        data: {'refresh_token': refreshToken},
      );
      return _sessionFromResponse(response.data);
    } on DioException catch (error) {
      throw AuthException(_messageFromDio(error));
    }
  }

  /// Web'deki needsMfaChallenge() ile aynı: AAL1→AAL2 yükseltmesi gerekiyor mu?
  /// Çağıran taraf, bu isteğin `refreshToken`'a ait geçici access token ile
  /// gönderilmesini sağlamalı (ApiClient'ın bellek token'ını güncelleyerek).
  Future<MfaStatusResult> mfaStatus(String refreshToken) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authMfaStatus,
        data: {'refresh_token': refreshToken},
      );
      return MfaStatusResult(
        needsChallenge: response.data?['needsChallenge'] == true,
      );
    } on DioException catch (error) {
      throw AuthException(_messageFromDio(error));
    }
  }

  Future<MfaChallengeResult> mfaChallenge(String refreshToken) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authMfaChallenge,
        data: {'refresh_token': refreshToken},
      );
      final data = response.data ?? const <String, dynamic>{};
      final factorId = data['factor_id'] as String?;
      final challengeId = data['challenge_id'] as String?;
      if (factorId == null || challengeId == null) {
        throw AuthException('MFA doğrulaması başlatılamadı.');
      }
      return MfaChallengeResult(factorId: factorId, challengeId: challengeId);
    } on DioException catch (error) {
      throw AuthException(_messageFromDio(error));
    }
  }

  Future<AuthSession> mfaVerify({
    required String refreshToken,
    required String factorId,
    required String challengeId,
    required String code,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authMfaVerify,
        data: {
          'refresh_token': refreshToken,
          'factor_id': factorId,
          'challenge_id': challengeId,
          'code': code,
        },
      );
      return _sessionFromResponse(response.data);
    } on DioException catch (error) {
      throw AuthException(_messageFromDio(error));
    }
  }

  AuthSession _sessionFromResponse(Map<String, dynamic>? data) {
    final token = _tryReadAccessToken(data);
    if (token == null) {
      throw AuthException('Sunucu access_token döndürmedi.');
    }
    return AuthSession(
      accessToken: token,
      refreshToken: _tryReadRefreshToken(data),
      userId: _tryReadUserId(data) ?? userIdFromJwt(token),
    );
  }

  /// `otp_required: true` ise (access_token yokluğu bir hata değildir) OTP
  /// sonucunu, aksi halde normal oturumu döner.
  LoginResult _loginResultFromResponse(Map<String, dynamic>? data) {
    final otpUserId = _tryReadOtpUserId(data);
    if (otpUserId != null) {
      return LoginResult.otpRequired(
        userId: otpUserId,
        message: data?['message'] as String?,
      );
    }
    return LoginResult.session(_sessionFromResponse(data));
  }

  String? _tryReadOtpUserId(dynamic data) {
    if (data is! Map) return null;
    final map = Map<String, dynamic>.from(data);
    if (map['otp_required'] != true) return null;
    final userId = map['user_id'];
    return userId is String && userId.isNotEmpty ? userId : null;
  }

  String? _tryReadAccessToken(dynamic data) {
    if (data is! Map) return null;
    final map = Map<String, dynamic>.from(data);
    final token = map['access_token'] ?? map['accessToken'];
    if (token is String && token.isNotEmpty) return token;
    return null;
  }

  String? _tryReadRefreshToken(dynamic data) {
    if (data is! Map) return null;
    final map = Map<String, dynamic>.from(data);
    final token = map['refresh_token'] ?? map['refreshToken'];
    if (token is String && token.isNotEmpty) return token;
    return null;
  }

  String? _tryReadUserId(dynamic data) {
    if (data is! Map) return null;
    final map = Map<String, dynamic>.from(data);
    final user = map['user'];
    if (user is Map) {
      final id = user['id'];
      if (id is String && id.isNotEmpty) return id;
    }
    return null;
  }

  String _messageFromDio(DioException error) {
    final status = error.response?.statusCode;
    final data = error.response?.data;

    if (data is Map) {
      final message = data['message'];
      if (message is String && message.isNotEmpty) return message;
      if (message is List && message.isNotEmpty) {
        return message.map((e) => e.toString()).join(', ');
      }
    }

    if (status == 401) {
      return 'E-posta veya şifre hatalı.';
    }
    if (status == 400) {
      return 'Geçersiz istek. Bilgilerinizi kontrol edin.';
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      // localhost: adb reverse gerekir; aksi halde LAN IP kullan.
      if (ApiConstants.baseUrl.contains('localhost') ||
          ApiConstants.baseUrl.contains('127.0.0.1')) {
        return 'Sunucuya bağlanılamadı. NestJS (:3000) çalışıyor mu? '
            'USB ile `adb reverse tcp:3000 tcp:3000` aktif mi?';
      }
      return 'Sunucuya bağlanılamadı. NestJS çalışıyor mu? '
          'Telefon ve PC aynı Wi‑Fi’de mi?';
    }
    return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}
