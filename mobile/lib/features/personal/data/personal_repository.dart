import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'personal_dto.dart';

class PersonalException implements Exception {
  PersonalException(this.message);
  final String message;
  @override
  String toString() => message;
}

class PersonalRepository {
  PersonalRepository({required ApiClient apiClient}) : _dio = apiClient.dio;
  final Dio _dio;

  Future<List<PersonalNoteDto>> fetchNotes() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.personalNotes,
      );
      final raw = response.data?['notes'];
      if (raw is! List) return const [];
      return raw
          .whereType<Map>()
          .map((e) => PersonalNoteDto.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  Future<PersonalNoteDto> createNote({
    required String title,
    String? content,
    String? taskId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.personalNotes,
        data: {
          'title': title,
          'content': content ?? '',
          'taskId': ?taskId,
        },
      );
      return PersonalNoteDto.fromJson(response.data ?? {});
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  Future<PersonalNoteDto> updateNote({
    required String noteId,
    String? title,
    String? content,
    String? taskId,
    bool? isCompleted,
    bool clearTaskId = false,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        ApiConstants.personalNote(noteId),
        data: {
          'title': ?title,
          'content': ?content,
          if (clearTaskId) 'taskId': null,
          if (!clearTaskId) 'taskId': ?taskId,
          'isCompleted': ?isCompleted,
        },
      );
      return PersonalNoteDto.fromJson(response.data ?? {});
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  Future<void> deleteNote(String noteId) async {
    try {
      await _dio.delete<void>(ApiConstants.personalNote(noteId));
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  Future<List<PersonalTodoDto>> fetchTodos() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.personalTodos,
      );
      final raw = response.data?['todos'];
      if (raw is! List) return const [];
      return raw
          .whereType<Map>()
          .map((e) => PersonalTodoDto.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  Future<PersonalTodoDto> createTodo({
    required String task,
    String? dueDate,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.personalTodos,
        data: {
          'task': task,
          'dueDate': ?dueDate,
        },
      );
      return PersonalTodoDto.fromJson(response.data ?? {});
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  Future<PersonalTodoDto> updateTodo({
    required String todoId,
    String? task,
    String? dueDate,
    bool? isCompleted,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        ApiConstants.personalTodo(todoId),
        data: {
          'task': ?task,
          'dueDate': ?dueDate,
          'isCompleted': ?isCompleted,
        },
      );
      return PersonalTodoDto.fromJson(response.data ?? {});
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  Future<void> deleteTodo(String todoId) async {
    try {
      await _dio.delete<void>(ApiConstants.personalTodo(todoId));
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  Future<List<PersonalFileDto>> fetchFiles() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.personalFiles,
      );
      final raw = response.data?['files'];
      if (raw is! List) return const [];
      return raw
          .whereType<Map>()
          .map((e) => PersonalFileDto.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  Future<PersonalFileDto> uploadFile({
    required String filePath,
    required String fileName,
  }) async {
    try {
      final form = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: fileName),
      });
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.personalFilesUpload,
        data: form,
      );
      return PersonalFileDto.fromJson(response.data ?? {});
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  Future<void> deleteFile(String fileId) async {
    try {
      await _dio.delete<void>(ApiConstants.personalFile(fileId));
    } on DioException catch (e) {
      throw PersonalException(_msg(e));
    }
  }

  String _msg(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return error.message ?? 'Kişisel alan işlemi başarısız.';
  }
}
