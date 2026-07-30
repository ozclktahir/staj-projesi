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

class TaskListMeta {
  const TaskListMeta({
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  factory TaskListMeta.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const TaskListMeta(
        total: 0,
        page: 1,
        limit: 40,
        totalPages: 1,
      );
    }
    return TaskListMeta(
      total: (json['total'] as num?)?.toInt() ?? 0,
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 40,
      totalPages: (json['totalPages'] as num?)?.toInt() ?? 1,
    );
  }

  final int total;
  final int page;
  final int limit;
  final int totalPages;

  bool get hasMore => page < totalPages;
}

class TaskListPage {
  const TaskListPage({
    required this.items,
    required this.meta,
  });

  final List<TaskDto> items;
  final TaskListMeta meta;
}

/// NestJS `/workspaces/:workspaceId/tasks` uçları.
class TaskRepository {
  TaskRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  static const int defaultPageSize = 40;

  Future<TaskListPage> fetchTasksPage({
    required String workspaceId,
    String? projectId,
    String? parentTaskId,
    String? assigneeId,
    String? search,
    TaskPriority? priority,
    TaskStatus? status,
    int page = 1,
    int limit = defaultPageSize,
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
      if (assigneeId != null && assigneeId.isNotEmpty) {
        query['assignee_id'] = assigneeId;
      }
      if (search != null && search.trim().isNotEmpty) {
        query['search'] = search.trim();
      }
      if (priority != null) {
        query['priority'] = priority.apiValue;
      }
      if (status != null) {
        query['status'] = status.apiValue;
      }

      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.workspaceTasks(workspaceId),
        queryParameters: query,
      );
      final body = response.data;
      final data = body?['data'];
      if (data is! List) {
        throw TaskException('Görev listesi beklenmeyen formatta.');
      }
      final items = data
          .whereType<Map>()
          .map((item) => TaskDto.fromJson(Map<String, dynamic>.from(item)))
          .toList();
      final metaRaw = body?['meta'];
      final meta = TaskListMeta.fromJson(
        metaRaw is Map ? Map<String, dynamic>.from(metaRaw) : null,
      );
      return TaskListPage(items: items, meta: meta);
    } on DioException catch (error) {
      throw TaskException(_messageFromDio(error));
    }
  }

  /// Geriye dönük kolaylık: yalnızca görev listesi.
  Future<List<TaskDto>> fetchTasks({
    required String workspaceId,
    String? projectId,
    String? parentTaskId,
    String? assigneeId,
    String? search,
    TaskPriority? priority,
    int page = 1,
    int limit = 100,
  }) async {
    final result = await fetchTasksPage(
      workspaceId: workspaceId,
      projectId: projectId,
      parentTaskId: parentTaskId,
      assigneeId: assigneeId,
      search: search,
      priority: priority,
      page: page,
      limit: limit,
    );
    return result.items;
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

  Future<Map<String, dynamic>> deleteTask({
    required String workspaceId,
    required String taskId,
  }) async {
    try {
      final response = await _dio.delete<Map<String, dynamic>>(
        ApiConstants.workspaceTask(workspaceId, taskId),
      );
      return response.data ??
          const <String, dynamic>{'mode': 'deleted', 'message': 'Görev silindi.'};
    } on DioException catch (error) {
      throw TaskException(_messageFromDio(error));
    }
  }

  Future<List<TaskDto>> fetchRejectedTasks({
    required String workspaceId,
    required String projectId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.workspaceRejectedTasks(workspaceId),
        queryParameters: {'projectId': projectId},
      );
      final raw = response.data?['tasks'];
      if (raw is! List) return const [];
      return raw
          .whereType<Map>()
          .map((item) => TaskDto.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw TaskException(_messageFromDio(error));
    }
  }

  Future<TaskDto> reassignRejectedTask({
    required String workspaceId,
    required String taskId,
    required String assigneeId,
    String? dueDate,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.workspaceTaskReassign(workspaceId, taskId),
        data: {
          'assignee_id': assigneeId,
          'due_date': ?dueDate,
        },
      );
      final task = response.data?['task'];
      if (task is Map) {
        return TaskDto.fromJson(Map<String, dynamic>.from(task));
      }
      throw TaskException('Yeniden atama yanıtı beklenmeyen formatta.');
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
