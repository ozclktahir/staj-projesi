import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/api_constants.dart';
import '../constants/storage_keys.dart';
import 'workspace_access_bus.dart';

/// Merkezi Dio istemcisi — JWT + workspace 403 yakalama.
class ApiClient {
  ApiClient({
    required this._secureStorage,
    Dio? dio,
  }) : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: ApiConstants.baseUrl,
                connectTimeout: ApiConstants.connectTimeout,
                receiveTimeout: ApiConstants.receiveTimeout,
                headers: const {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              ),
            ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token =
              await _secureStorage.read(key: StorageKeys.accessToken);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          _maybeHandleWorkspaceForbidden(error);
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;
  final FlutterSecureStorage _secureStorage;

  Dio get dio => _dio;

  void _maybeHandleWorkspaceForbidden(DioException error) {
    final status = error.response?.statusCode;
    if (status != 403) return;

    final message = _messageFromResponse(error.response?.data);
    if (!_looksLikeWorkspaceAccessError(message)) return;

    final workspaceId = _workspaceIdFromPath(error.requestOptions.path);
    debugPrint(
      '[ApiClient] workspace 403 → bus (workspaceId=$workspaceId)',
    );
    WorkspaceAccessBus.instance.notifyForbidden(workspaceId);
  }

  static String _messageFromResponse(dynamic data) {
    if (data is Map) {
      final message = data['message'];
      if (message is String) return message;
      if (message is List && message.isNotEmpty) {
        return message.map((e) => e.toString()).join(', ');
      }
    }
    if (data is String) return data;
    return '';
  }

  static bool _looksLikeWorkspaceAccessError(String message) {
    final lower = message.toLowerCase();
    return lower.contains('workspace') ||
        lower.contains('çalışma alan') ||
        lower.contains('calisma alan') ||
        lower.contains('erişim izniniz yok') ||
        lower.contains('erisim izniniz yok') ||
        lower.contains('yetkiniz bulunmamaktadır') ||
        lower.contains('yetkiniz yok');
  }

  /// `/workspaces/:id/...` veya `/workspace/:id` path'lerinden id çıkarır.
  static String? _workspaceIdFromPath(String path) {
    final segments = path.split('/').where((s) => s.isNotEmpty).toList();
    for (var i = 0; i < segments.length - 1; i++) {
      final seg = segments[i];
      if (seg == 'workspaces' || seg == 'workspace') {
        final id = segments[i + 1];
        if (id.isNotEmpty && id != 'invite') return id;
      }
    }
    return null;
  }
}
