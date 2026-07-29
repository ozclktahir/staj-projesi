import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'activity_log_dto.dart';

class ActivityLogException implements Exception {
  ActivityLogException(this.message);

  final String message;

  @override
  String toString() => message;
}

class ActivityLogRepository {
  ActivityLogRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  /// `GET /workspaces/:workspaceId/activity-logs`
  Future<List<ActivityLogDto>> fetchActivityLogs(String workspaceId) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.workspaceActivityLogs(workspaceId),
      );
      final data = response.data;
      if (data is! List) {
        throw ActivityLogException('Aktivite listesi beklenmeyen formatta.');
      }
      return data
          .whereType<Map>()
          .map(
            (item) =>
                ActivityLogDto.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList();
    } on DioException catch (error) {
      throw ActivityLogException(_messageFromDio(error));
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

    if (status == 401) {
      return 'Oturum süresi dolmuş olabilir. Tekrar giriş yapın.';
    }
    if (status == 403) return 'Bu işlem için yetkiniz yok.';
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Sunucuya bağlanılamadı.';
    }
    return 'Aktivite kayıtları alınamadı.';
  }
}
