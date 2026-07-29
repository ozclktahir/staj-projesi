import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'login_dto.dart';
import 'register_dto.dart';

class AuthException implements Exception {
  AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// NestJS `/auth/*` uçları — JWT access_token döner.
class AuthRepository {
  AuthRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  Future<String> login(LoginDto dto) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authLogin,
        data: dto.toJson(),
      );
      return _extractAccessToken(response.data);
    } on DioException catch (error) {
      throw AuthException(_messageFromDio(error));
    }
  }

  /// Kayıt sonrası session dönmeyebilir; token için login yapılır.
  Future<String> register(RegisterDto dto) async {
    try {
      final response = await _dio.post<dynamic>(
        ApiConstants.authRegister,
        data: dto.toJson(),
      );

      final token = _tryReadAccessToken(response.data);
      if (token != null) return token;

      return login(
        LoginDto(email: dto.email, password: dto.password),
      );
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

  String _extractAccessToken(Map<String, dynamic>? data) {
    final token = _tryReadAccessToken(data);
    if (token == null) {
      throw AuthException('Sunucu access_token döndürmedi.');
    }
    return token;
  }

  String? _tryReadAccessToken(dynamic data) {
    if (data is! Map) return null;
    final map = Map<String, dynamic>.from(data);
    final token = map['access_token'] ?? map['accessToken'];
    if (token is String && token.isNotEmpty) return token;
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
      return 'Sunucuya bağlanılamadı. NestJS çalışıyor mu?';
    }
    return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}
