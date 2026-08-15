import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'search_hit_dto.dart';
import 'workspace_dto.dart';

class WorkspaceException implements Exception {
  WorkspaceException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// NestJS `/workspace` uçları.
class WorkspaceRepository {
  WorkspaceRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  Future<List<WorkspaceDto>> fetchWorkspaces() async {
    try {
      final response = await _dio.get<dynamic>(ApiConstants.workspaces);
      final data = response.data;
      if (data is! List) {
        throw WorkspaceException('Çalışma alanları listesi beklenmeyen formatta.');
      }
      return data
          .whereType<Map>()
          .map((item) => WorkspaceDto.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw WorkspaceException(_messageFromDio(error));
    }
  }

  Future<WorkspaceDto> createWorkspace(CreateWorkspaceDto dto) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.workspaces,
        data: dto.toJson(),
      );
      final data = response.data;
      if (data == null) {
        throw WorkspaceException('Sunucu çalışma alanı döndürmedi.');
      }
      return WorkspaceDto.fromJson(data);
    } on DioException catch (error) {
      throw WorkspaceException(_messageFromDio(error));
    }
  }

  Future<void> deleteWorkspace(String workspaceId) async {
    try {
      await _dio.delete<void>(ApiConstants.workspaceById(workspaceId));
    } on DioException catch (error) {
      throw WorkspaceException(_messageFromDio(error));
    }
  }

  /// Web'in globalSearch() server action'ının NestJS karşılığı — proje/görev/üye arar.
  Future<List<SearchHitDto>> search({
    required String workspaceId,
    required String query,
  }) async {
    final q = query.trim();
    if (q.isEmpty) return const [];
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.workspaceSearch(workspaceId),
        queryParameters: {'q': q},
      );
      final data = response.data;
      final raw = data is Map ? data['hits'] : data;
      if (raw is! List) return const [];
      return raw
          .whereType<Map>()
          .map((item) => SearchHitDto.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw WorkspaceException(_messageFromDio(error));
    }
  }

  /// Web'deki leaveWorkspace() server action ile aynı kurallar backend'de
  /// uygulanır: gerçek sahip ayrılamaz; tek Admin/OWNER iken ayrılamaz.
  Future<void> leaveWorkspace(String workspaceId) async {
    try {
      await _dio.post<void>(ApiConstants.workspaceLeave(workspaceId));
    } on DioException catch (error) {
      throw WorkspaceException(_messageFromDio(error));
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
      return 'Sunucuya bağlanılamadı. NestJS çalışıyor mu?';
    }
    return 'Çalışma alanı işlemi başarısız oldu.';
  }
}
