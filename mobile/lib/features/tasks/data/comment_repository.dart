import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'comment_dto.dart';

class CommentException implements Exception {
  CommentException(this.message);

  final String message;

  @override
  String toString() => message;
}

class CommentRepository {
  CommentRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  Future<List<CommentDto>> fetchComments({
    required String workspaceId,
    required String taskId,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.taskComments(workspaceId, taskId),
      );
      final data = response.data;
      if (data is! List) {
        throw CommentException('Yorum listesi beklenmeyen formatta.');
      }
      return data
          .whereType<Map>()
          .map((item) => CommentDto.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw CommentException(_messageFromDio(error));
    }
  }

  Future<CommentDto> addComment({
    required String workspaceId,
    required String taskId,
    required CreateCommentDto dto,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.taskComments(workspaceId, taskId),
        data: dto.toJson(),
      );
      final data = response.data;
      if (data == null) {
        throw CommentException('Sunucu yorum döndürmedi.');
      }
      return CommentDto.fromJson(data);
    } on DioException catch (error) {
      throw CommentException(_messageFromDio(error));
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
    return 'Yorum işlemi başarısız oldu.';
  }
}
