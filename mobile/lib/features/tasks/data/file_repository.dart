import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'file_dto.dart';

class FileException implements Exception {
  FileException(this.message);

  final String message;

  @override
  String toString() => message;
}

class FileRepository {
  FileRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  Future<List<TaskFileDto>> fetchFiles({
    required String workspaceId,
    required String taskId,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.taskFiles(workspaceId, taskId),
      );
      final data = response.data;
      if (data is! List) {
        throw FileException('Dosya listesi beklenmeyen formatta.');
      }
      return data
          .whereType<Map>()
          .map((item) => TaskFileDto.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw FileException(_messageFromDio(error));
    }
  }

  /// Multipart upload + metadata kaydı (upload `url` → create `file_url`).
  Future<TaskFileDto> uploadAndAttach({
    required String workspaceId,
    required String taskId,
    required String fileName,
    String? filePath,
    Uint8List? bytes,
    String? mimeType,
  }) async {
    try {
      final MultipartFile part;
      if (filePath != null && filePath.isNotEmpty) {
        part = await MultipartFile.fromFile(filePath, filename: fileName);
      } else if (bytes != null) {
        part = MultipartFile.fromBytes(bytes, filename: fileName);
      } else {
        throw FileException('Seçilen dosya okunamadı.');
      }

      final formData = FormData.fromMap({'file': part});
      final uploadResponse = await _dio.post<Map<String, dynamic>>(
        ApiConstants.taskFileUpload(workspaceId, taskId),
        data: formData,
        options: Options(
          contentType: Headers.multipartFormDataContentType,
        ),
      );

      final uploadData = uploadResponse.data;
      if (uploadData == null) {
        throw FileException('Sunucu yükleme sonucu döndürmedi.');
      }
      final uploaded = FileUploadResultDto.fromJson(uploadData);
      if (uploaded.url.isEmpty) {
        throw FileException('Yükleme URL\'i alınamadı.');
      }

      final createResponse = await _dio.post<Map<String, dynamic>>(
        ApiConstants.taskFiles(workspaceId, taskId),
        data: CreateFileDto(
          fileName: uploaded.fileName.isNotEmpty ? uploaded.fileName : fileName,
          fileUrl: uploaded.url,
          fileType: uploaded.fileType ?? mimeType,
        ).toJson(),
      );

      final created = createResponse.data;
      if (created == null) {
        throw FileException('Dosya kaydı oluşturulamadı.');
      }
      return TaskFileDto.fromJson(created);
    } on FileException {
      rethrow;
    } on DioException catch (error) {
      throw FileException(_messageFromDio(error));
    } catch (_) {
      throw FileException('Dosya yüklenemedi.');
    }
  }

  Future<void> deleteFile({
    required String workspaceId,
    required String taskId,
    required String fileId,
  }) async {
    try {
      await _dio.delete<void>(
        ApiConstants.taskFile(workspaceId, taskId, fileId),
      );
    } on DioException catch (error) {
      throw FileException(_messageFromDio(error));
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
    if (status == 413) return 'Dosya boyutu çok büyük.';
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Sunucuya bağlanılamadı.';
    }
    return 'Dosya işlemi başarısız oldu.';
  }
}
