import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'workspace_statistics_dto.dart';

class DashboardException implements Exception {
  DashboardException(this.message);

  final String message;

  @override
  String toString() => message;
}

class DashboardRepository {
  DashboardRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  Future<WorkspaceStatisticsDto> fetchStatistics(String workspaceId) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.workspaceStatistics(workspaceId),
      );
      return WorkspaceStatisticsDto.fromJson(response.data);
    } on DioException catch (error) {
      throw DashboardException(_messageFromDio(error));
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

    if (status == 401) return 'Oturum süresi dolmuş olabilir.';
    if (status == 403) return 'Bu işlem için yetkiniz yok.';
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Sunucuya bağlanılamadı.';
    }
    return 'İstatistikler yüklenemedi.';
  }
}
