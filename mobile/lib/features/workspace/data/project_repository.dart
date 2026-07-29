import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'project_dto.dart';

class ProjectException implements Exception {
  ProjectException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// NestJS `/workspaces/:workspaceId/projects` uçları.
class ProjectRepository {
  ProjectRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  Future<List<ProjectDto>> fetchProjects(String workspaceId) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.workspaceProjects(workspaceId),
      );
      final data = response.data;
      if (data is! List) {
        throw ProjectException('Proje listesi beklenmeyen formatta.');
      }
      return data
          .whereType<Map>()
          .map((item) => ProjectDto.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw ProjectException(_messageFromDio(error));
    }
  }

  Future<ProjectDto> createProject({
    required String workspaceId,
    required CreateProjectDto dto,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.workspaceProjects(workspaceId),
        data: dto.toJson(),
      );
      final data = response.data;
      if (data == null) {
        throw ProjectException('Sunucu proje döndürmedi.');
      }
      return ProjectDto.fromJson(data);
    } on DioException catch (error) {
      throw ProjectException(_messageFromDio(error));
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
    if (status == 404) return 'Çalışma alanı veya proje bulunamadı.';
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Sunucuya bağlanılamadı. NestJS çalışıyor mu?';
    }
    return 'Proje işlemi başarısız oldu.';
  }
}
