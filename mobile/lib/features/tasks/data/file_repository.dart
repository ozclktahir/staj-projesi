import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

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
      final resolvedMime =
          (mimeType != null && mimeType.trim().isNotEmpty)
              ? mimeType.trim()
              : _guessMimeFromName(fileName);

      final MultipartFile part;
      if (bytes != null && bytes.isNotEmpty) {
        part = MultipartFile.fromBytes(bytes, filename: fileName);
      } else if (filePath != null && filePath.isNotEmpty) {
        part = await MultipartFile.fromFile(filePath, filename: fileName);
      } else {
        throw FileException('Seçilen dosya okunamadı.');
      }

      debugPrint(
        '[FileUpload] POST multipart name=$fileName mime=$resolvedMime '
        'bytes=${bytes?.length ?? 'path'} task=$taskId',
      );

      final formData = FormData.fromMap({'file': part});
      // Content-Type elle set edilmez; ApiClient FormData için json header'ı siler.
      final uploadResponse = await _dio.post<Map<String, dynamic>>(
        ApiConstants.taskFileUpload(workspaceId, taskId),
        data: formData,
      );

      final uploadData = uploadResponse.data;
      if (uploadData == null) {
        throw FileException('Sunucu yükleme sonucu döndürmedi.');
      }
      debugPrint('[FileUpload] upload OK keys=${uploadData.keys.toList()}');

      final uploaded = FileUploadResultDto.fromJson(uploadData);
      if (uploaded.url.isEmpty) {
        throw FileException('Yükleme URL\'i alınamadı.');
      }

      final createResponse = await _dio.post<Map<String, dynamic>>(
        ApiConstants.taskFiles(workspaceId, taskId),
        data: CreateFileDto(
          fileName: uploaded.fileName.isNotEmpty ? uploaded.fileName : fileName,
          fileUrl: uploaded.url,
          fileType: uploaded.fileType ?? resolvedMime,
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
      debugPrint(
        '[FileUpload] DioException status=${error.response?.statusCode} '
        'data=${error.response?.data}',
      );
      throw FileException(_messageFromDio(error));
    } catch (error) {
      debugPrint('[FileUpload] unexpected: $error');
      throw FileException('Dosya yüklenemedi: $error');
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

  String _guessMimeFromName(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.txt')) return 'text/plain';
    if (lower.endsWith('.doc')) return 'application/msword';
    if (lower.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
    if (lower.endsWith('.xlsx')) {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    if (lower.endsWith('.zip')) return 'application/zip';
    return 'application/octet-stream';
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
