import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'notification_dto.dart';

class NotificationException implements Exception {
  NotificationException(this.message);

  final String message;

  @override
  String toString() => message;
}

class NotificationRepository {
  NotificationRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  Future<List<NotificationDto>> fetchNotifications(String workspaceId) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.workspaceNotifications(workspaceId),
      );
      final data = response.data;
      if (data is! List) {
        throw NotificationException('Bildirim listesi beklenmeyen formatta.');
      }
      return data
          .whereType<Map>()
          .map(
            (item) =>
                NotificationDto.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList();
    } on DioException catch (error) {
      throw NotificationException(_messageFromDio(error));
    }
  }

  Future<NotificationDto> markAsRead({
    required String workspaceId,
    required String notificationId,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        ApiConstants.notificationRead(workspaceId, notificationId),
      );
      final data = response.data;
      if (data == null) {
        throw NotificationException('Bildirim güncellenemedi.');
      }
      return NotificationDto.fromJson(data);
    } on DioException catch (error) {
      throw NotificationException(_messageFromDio(error));
    }
  }

  Future<void> markAllAsRead(String workspaceId) async {
    try {
      await _dio.patch<void>(
        ApiConstants.notificationsReadAll(workspaceId),
      );
    } on DioException catch (error) {
      throw NotificationException(_messageFromDio(error));
    }
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

    if (status == 401) return 'Oturum süresi dolmuş olabilir. Tekrar giriş yapın.';
    if (status == 403) return 'Bu işlem için yetkiniz yok.';
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Sunucuya bağlanılamadı.';
    }
    return 'Bildirim işlemi başarısız oldu.';
  }
}
