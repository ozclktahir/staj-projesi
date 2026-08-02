import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/api_constants.dart';
import '../constants/storage_keys.dart';
import 'auth_session_bus.dart';
import 'workspace_access_bus.dart';

/// Merkezi Dio istemcisi — JWT + silent refresh + 401/403 yakalama.
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
      QueuedInterceptorsWrapper(
        onRequest: (options, handler) async {
          var token = _memoryAccessToken;
          if (token == null || token.isEmpty) {
            token = await _secureStorage.read(key: StorageKeys.accessToken);
          }
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          } else {
            options.headers.remove('Authorization');
          }
          // FormData: varsayılan application/json boundary'yi bozar — kaldır.
          if (options.data is FormData) {
            options.headers.remove(Headers.contentTypeHeader);
            options.contentType = null;
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (await _tryRefreshAndRetry(error, handler)) {
            return;
          }
          _maybeHandleUnauthorized(error);
          _maybeHandleWorkspaceForbidden(error);
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;
  final FlutterSecureStorage _secureStorage;
  var _clearingUnauthorized = false;
  var _refreshing = false;
  Completer<bool>? _refreshCompleter;

  /// Auth state ile senkron bellek token'ı (web secure-storage yarışını önler).
  String? _memoryAccessToken;
  String? _memoryRefreshToken;

  Dio get dio => _dio;

  void updateAccessToken(String? token) {
    final trimmed = token?.trim();
    _memoryAccessToken =
        (trimmed == null || trimmed.isEmpty) ? null : trimmed;
  }

  void updateRefreshToken(String? token) {
    final trimmed = token?.trim();
    _memoryRefreshToken =
        (trimmed == null || trimmed.isEmpty) ? null : trimmed;
  }

  Future<bool> _tryRefreshAndRetry(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    if (error.response?.statusCode != 401) return false;
    final path = error.requestOptions.path;
    if (_isAuthPath(path)) return false;
    if (error.requestOptions.extra['retriedAfterRefresh'] == true) {
      return false;
    }

    final refreshed = await refreshAccessToken();
    if (!refreshed) return false;

    try {
      final opts = error.requestOptions;
      opts.headers['Authorization'] = 'Bearer $_memoryAccessToken';
      opts.extra['retriedAfterRefresh'] = true;
      final response = await _dio.fetch<dynamic>(opts);
      handler.resolve(response);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Refresh token ile access token yeniler. Başarılıysa true.
  Future<bool> refreshAccessToken() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }
    _refreshing = true;
    _refreshCompleter = Completer<bool>();
    try {
      var refresh = _memoryRefreshToken;
      refresh ??= await _secureStorage.read(key: StorageKeys.refreshToken);
      if (refresh == null || refresh.isEmpty) {
        _refreshCompleter!.complete(false);
        return false;
      }

      // Interceptor döngüsünü önlemek için ayrı Dio.
      final bare = Dio(
        BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: ApiConstants.connectTimeout,
          receiveTimeout: ApiConstants.receiveTimeout,
          headers: const {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        ),
      );
      final response = await bare.post<Map<String, dynamic>>(
        ApiConstants.authRefresh,
        data: {'refresh_token': refresh},
      );
      final data = response.data;
      final access = data?['access_token'] ?? data?['accessToken'];
      final nextRefresh = data?['refresh_token'] ?? data?['refreshToken'];
      if (access is! String || access.isEmpty) {
        _refreshCompleter!.complete(false);
        return false;
      }

      updateAccessToken(access);
      await _secureStorage.write(key: StorageKeys.accessToken, value: access);
      if (nextRefresh is String && nextRefresh.isNotEmpty) {
        updateRefreshToken(nextRefresh);
        await _secureStorage.write(
          key: StorageKeys.refreshToken,
          value: nextRefresh,
        );
      }
      _refreshCompleter!.complete(true);
      return true;
    } catch (error, stack) {
      debugPrint('[ApiClient] refresh failed: $error\n$stack');
      _refreshCompleter!.complete(false);
      return false;
    } finally {
      _refreshing = false;
      _refreshCompleter = null;
    }
  }

  void _maybeHandleUnauthorized(DioException error) {
    if (error.response?.statusCode != 401) return;
    if (_isAuthPath(error.requestOptions.path)) return;
    if (_refreshing) return;
    debugPrint('[ApiClient] 401 Unauthorized → session bus');
    unawaited(_clearLocalTokensThenNotify());
  }

  bool _isAuthPath(String path) {
    return path.contains('/auth/login') ||
        path.contains('/auth/register') ||
        path.contains('/auth/refresh');
  }

  Future<void> _clearLocalTokensThenNotify() async {
    if (_clearingUnauthorized) return;
    _clearingUnauthorized = true;
    try {
      _memoryAccessToken = null;
      _memoryRefreshToken = null;
      await _secureStorage.delete(key: StorageKeys.accessToken);
      await _secureStorage.delete(key: StorageKeys.refreshToken);
      await _secureStorage.delete(key: StorageKeys.userId);
    } catch (error, stack) {
      debugPrint('[ApiClient] token clear failed: $error\n$stack');
    } finally {
      AuthSessionBus.instance.notifyUnauthorized();
      _clearingUnauthorized = false;
    }
  }

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
