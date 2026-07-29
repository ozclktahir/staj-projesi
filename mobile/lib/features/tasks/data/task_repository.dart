import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'create_task_dto.dart';
import 'task_dto.dart';
import 'update_task_dto.dart';

class TaskException implements Exception {
  TaskException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// NestJS `/workspaces/:workspaceId/tasks` uçları.
class TaskRepository {
  TaskRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  Future<List<TaskDto>> fetchTasks({
    required String workspaceId,
    String? projectId,
    String? parentTaskId,
    int page = 1,
    int limit = 100,
  }) async {
    try {
      final query = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (projectId != null && projectId.isNotEmpty) {
        query['projectId'] = projectId;
      }
      if (parentTaskId != null && parentTaskId.isNotEmpty) {
        query['parent_task_id'] = parentTaskId;
      }

      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.workspaceTasks(workspaceId),
        queryParameters: query,
      );
      final data = response.data?['data'];
      if (data is! List) {
        throw TaskException('Görev listesi beklenmeyen formatta.');
      }
      return data
          .whereType<Map>()
          .map((item) => TaskDto.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw TaskException(_messageFromDio(error));
    }
  }

  Future<TaskDto> createTask({
    required String workspaceId,
    required CreateTaskDto dto,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.workspaceTasks(workspaceId),
        data: dto.toJson(),
      );
      final data = response.data;
      if (data == null) {
        throw TaskException('Sunucu görev döndürmedi.');
      }
      return TaskDto.fromJson(data);
    } on DioException catch (error) {
      throw TaskException(_messageFromDio(error));
    }
  }

  Future<TaskDto> updateTask({
    required String workspaceId,
    required String taskId,
    required UpdateTaskDto dto,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        ApiConstants.workspaceTask(workspaceId, taskId),
        data: dto.toJson(),
      );
      final data = response.data;
      if (data == null) {
        throw TaskException('Sunucu güncellenmiş görev döndürmedi.');
      }
      return TaskDto.fromJson(data);
    } on DioException catch (error) {
      throw TaskException(_messageFromDio(error));
    }
  }

  Future<void> deleteTask({
    required String workspaceId,
    required String taskId,
  }) async {
    try {
      await _dio.delete<void>(
        ApiConstants.workspaceTask(workspaceId, taskId),
      );
    } on DioException catch (error) {
      throw TaskException(_messageFromDio(error));
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
    if (status == 404) return 'Görev bulunamadı.';
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Sunucuya bağlanılamadı. NestJS çalışıyor mu?';
    }
    return 'Görev işlemi başarısız oldu.';
  }
}
