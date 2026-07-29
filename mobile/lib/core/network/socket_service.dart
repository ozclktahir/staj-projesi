import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../constants/api_constants.dart';

typedef SocketPayloadHandler = void Function(dynamic payload);

/// NestJS Socket.IO istemcisi — auth + workspace odası.
class SocketService {
  io.Socket? _socket;

  bool get isConnected => _socket?.connected ?? false;

  void connect({
    required String token,
    required String userId,
    String? workspaceId,
    SocketPayloadHandler? onTaskUpdated,
    SocketPayloadHandler? onNewNotification,
    SocketPayloadHandler? onActivityLogged,
  }) {
    disconnect();

    final options = io.OptionBuilder()
        .setTransports(['websocket'])
        .enableAutoConnect()
        .enableReconnection()
        .setAuth({
          'token': token,
          'userId': userId,
          if (workspaceId != null && workspaceId.isNotEmpty)
            'workspaceId': workspaceId,
        })
        .setQuery({
          'token': token,
          'userId': userId,
          if (workspaceId != null && workspaceId.isNotEmpty)
            'workspaceId': workspaceId,
        })
        .build();

    final socket = io.io(ApiConstants.baseUrl, options);
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

    if (onTaskUpdated != null) {
      socket.on('task_updated', onTaskUpdated);
    }
    if (onNewNotification != null) {
      socket.on('new_notification', onNewNotification);
      // Geriye dönük uyumluluk
      socket.on('notification', onNewNotification);
    }
    if (onActivityLogged != null) {
      socket.on('activity_logged', onActivityLogged);
    }
  }

  void disconnect() {
    final socket = _socket;
    if (socket == null) return;
    socket.clearListeners();
    socket.dispose();
    _socket = null;
  }
}
