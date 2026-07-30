import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'workspace_member_dto.dart';

class WorkspaceMembersException implements Exception {
  WorkspaceMembersException(this.message);

  final String message;

  @override
  String toString() => message;
}

class WorkspaceMembersRepository {
  WorkspaceMembersRepository({required ApiClient apiClient})
      : _dio = apiClient.dio;

  final Dio _dio;

  Future<WorkspaceMembersResponse> fetchMembers(String workspaceId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.workspaceMembers(workspaceId),
      );
      final data = response.data;
      if (data == null) {
        throw WorkspaceMembersException('Üye listesi boş yanıt.');
      }
      return WorkspaceMembersResponse.fromJson(data);
    } on DioException catch (error) {
      throw WorkspaceMembersException(_messageFromDio(error));
    }
  }

  String _messageFromDio(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    if (data is Map && data['message'] is List) {
      final list = data['message'] as List;
      if (list.isNotEmpty) return list.first.toString();
    }
    return error.message ?? 'Üyeler yüklenemedi.';
  }
}
