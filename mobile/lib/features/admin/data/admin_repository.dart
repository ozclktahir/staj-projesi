import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

class AdminException implements Exception {
  AdminException(this.message);
  final String message;
  @override
  String toString() => message;
}

class AdminStatsDto {
  const AdminStatsDto({
    required this.totalUsers,
    required this.activeTasks,
    required this.totalProjects,
  });

  factory AdminStatsDto.fromJson(Map<String, dynamic> json) {
    return AdminStatsDto(
      totalUsers: (json['totalUsers'] as num?)?.toInt() ?? 0,
      activeTasks: (json['activeTasks'] as num?)?.toInt() ?? 0,
      totalProjects: (json['totalProjects'] as num?)?.toInt() ?? 0,
    );
  }

  final int totalUsers;
  final int activeTasks;
  final int totalProjects;
}

class AdminRepository {
  AdminRepository({required ApiClient apiClient}) : _dio = apiClient.dio;
  final Dio _dio;

  Future<AdminStatsDto> fetchStats(String workspaceId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.workspaceAdminStats(workspaceId),
      );
      final data = response.data;
      if (data == null) throw AdminException('İstatistik yanıtı boş.');
      return AdminStatsDto.fromJson(data);
    } on DioException catch (e) {
      throw AdminException(_msg(e));
    }
  }

  Future<void> removeUser({
    required String workspaceId,
    required String userId,
  }) async {
    try {
      await _dio.delete<void>(
        ApiConstants.workspaceAdminRemoveUser(workspaceId, userId),
      );
    } on DioException catch (e) {
      throw AdminException(_msg(e));
    }
  }

  String _msg(DioException error) {
    final data = error.response?.data;
    if (data is Map) {
      final message = data['message'];
      if (message is String && message.isNotEmpty) return message;
      if (message is List && message.isNotEmpty) {
        return message.map((e) => e.toString()).join(', ');
      }
    }
    if (error.response?.statusCode == 403) {
      return 'Bu işlem için admin yetkisi gerekir.';
    }
    return 'Admin işlemi başarısız oldu.';
  }
}
