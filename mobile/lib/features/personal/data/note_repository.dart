import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'note_dto.dart';

class NoteException implements Exception {
  NoteException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// NestJS `/workspaces/:workspaceId/notes` — kullanıcıya özel notlar.
class NoteRepository {
  NoteRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  Future<List<NoteDto>> fetchNotes(String workspaceId) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.workspaceNotes(workspaceId),
      );
      final data = response.data;
      if (data is! List) {
        throw NoteException('Not listesi beklenmeyen formatta.');
      }
      return data
          .whereType<Map>()
          .map((item) => NoteDto.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw NoteException(_messageFromDio(error));
    }
  }

  Future<NoteDto> createNote({
    required String workspaceId,
    required CreateNoteDto dto,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.workspaceNotes(workspaceId),
        data: dto.toJson(),
      );
      final data = response.data;
      if (data == null) {
        throw NoteException('Sunucu not döndürmedi.');
      }
      return NoteDto.fromJson(data);
    } on DioException catch (error) {
      throw NoteException(_messageFromDio(error));
    }
  }

  Future<void> deleteNote({
    required String workspaceId,
    required String noteId,
  }) async {
    try {
      await _dio.delete<void>(
        ApiConstants.workspaceNote(workspaceId, noteId),
      );
    } on DioException catch (error) {
      throw NoteException(_messageFromDio(error));
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
    return 'Not işlemi başarısız oldu.';
  }
}
