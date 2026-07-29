import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../constants/api_constants.dart';

typedef SocketPayloadHandler = void Function(dynamic payload);

/// NestJS Socket.IO istemcisi — web (Chrome) ve mobil uyumlu.
class SocketService {
  io.Socket? _socket;
  String? _signature;

  bool get isConnected => _socket?.connected ?? false;

  /// Aynı oturum/workspace için gereksiz reconnect yapılmaz.
  void connect({
    required String token,
    required String userId,
    String? workspaceId,
    SocketPayloadHandler? onTaskUpdated,
    SocketPayloadHandler? onNewNotification,
    SocketPayloadHandler? onActivityLogged,
  }) {
    final signature = '$userId|${workspaceId ?? ''}|${token.hashCode}';
    if (_socket != null && _signature == signature && _socket!.connected) {
      return;
    }

    disconnect();
    _signature = signature;

    // Token'ı query'ye koyma (URL uzunluğu / özel karakter sorunları).
    // userId + workspaceId query; token yalnızca auth objesinde.
    final query = <String, dynamic>{
      'userId': userId,
      if (workspaceId != null && workspaceId.isNotEmpty) 'workspaceId': workspaceId,
    };

    final options = io.OptionBuilder()
        .setTransports(['websocket', 'polling'])
        .setPath('/socket.io')
        .enableAutoConnect()
        .enableReconnection()
        .enableForceNew()
        .setTimeout(12000)
        .setAuth({
          'token': token,
          'userId': userId,
          if (workspaceId != null && workspaceId.isNotEmpty)
            'workspaceId': workspaceId,
        })
        .setQuery(query)
        .build();

    final socket = io.io(
      ApiConstants.baseUrl,
      options,
    );
    _socket = socket;

    socket.onConnect((_) {
      debugPrint('[Socket] connected ${socket.id}');
    });
    socket.onDisconnect((_) {
      debugPrint('[Socket] disconnected');
    });
    socket.onConnectError((error) {
      debugPrint('[Socket] connect error: $error');
    });
    socket.onError((error) {
      debugPrint('[Socket] error: $error');
    });

    if (onTaskUpdated != null) {
      socket.on('task_updated', onTaskUpdated);
    }
    if (onNewNotification != null) {
      socket.on('new_notification', onNewNotification);
      socket.on('notification', onNewNotification);
    }
    if (onActivityLogged != null) {
      socket.on('activity_logged', onActivityLogged);
    }
  }

  void disconnect() {
    final socket = _socket;
    _socket = null;
    _signature = null;
    if (socket == null) return;
    try {
      socket.clearListeners();
      socket.disconnect();
      socket.dispose();
    } catch (error) {
      debugPrint('[Socket] disconnect error: $error');
    }
  }
}
