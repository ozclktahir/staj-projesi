import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

class ProgressReportException implements Exception {
  ProgressReportException(this.message);
  final String message;
  @override
  String toString() => message;
}

class ProgressReportDto {
  const ProgressReportDto({
    required this.id,
    required this.title,
    required this.content,
    required this.reportType,
    this.createdAt,
    this.userId,
  });

  factory ProgressReportDto.fromJson(Map<String, dynamic> json) {
    return ProgressReportDto(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      reportType: json['report_type'] as String? ?? 'DAILY',
      createdAt: json['created_at'] as String?,
      userId: json['user_id'] as String?,
    );
  }

  final String id;
  final String title;
  final String content;
  final String reportType;
  final String? createdAt;
  final String? userId;
}

class ProgressReportRepository {
  ProgressReportRepository({required ApiClient apiClient})
      : _dio = apiClient.dio;
  final Dio _dio;

  Future<List<ProgressReportDto>> fetchReports(String workspaceId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.workspaceProgressReports(workspaceId),
        queryParameters: {'page': 1, 'limit': 50},
      );
      final raw = response.data?['data'];
      if (raw is! List) return const [];
      return raw
          .whereType<Map>()
          .map(
            (e) => ProgressReportDto.fromJson(Map<String, dynamic>.from(e)),
          )
          .toList();
    } on DioException catch (e) {
      throw ProgressReportException(_msg(e));
    }
  }

  Future<ProgressReportDto> create({
    required String workspaceId,
    required String reportType,
    required String title,
    required String content,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.workspaceProgressReports(workspaceId),
        data: {
          'report_type': reportType,
          'title': title,
          'content': content,
        },
      );
      final data = response.data;
      if (data == null) {
        throw ProgressReportException('Rapor yanıtı boş.');
      }
      return ProgressReportDto.fromJson(data);
    } on DioException catch (e) {
      throw ProgressReportException(_msg(e));
    }
  }

  Future<void> delete({
    required String workspaceId,
    required String reportId,
  }) async {
    try {
      await _dio.delete<void>(
        ApiConstants.workspaceProgressReport(workspaceId, reportId),
      );
    } on DioException catch (e) {
      throw ProgressReportException(_msg(e));
    }
  }

  String _msg(DioException error) {
    final data = error.response?.data;
    if (data is Map) {
      final message = data['message'];
      if (message is String && message.isNotEmpty) return message;
    }
    return 'İlerleme raporu işlemi başarısız.';
  }
}
