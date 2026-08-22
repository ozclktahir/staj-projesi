import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../constants/api_constants.dart';

typedef SocketPayloadHandler = void Function(dynamic payload);

/// NestJS Socket.IO istemcisi — web (Chrome) ve mobil uyumlu.
class SocketService {
  io.Socket? _socket;
  String? _signature;
  String? _joinedWorkspaceId;

  bool get isConnected => _socket?.connected ?? false;

  /// Aynı oturum/workspace için gereksiz reconnect yapılmaz.
  void connect({
    required String token,
    required String userId,
    String? workspaceId,
    SocketPayloadHandler? onTaskUpdated,
    SocketPayloadHandler? onNewNotification,
    SocketPayloadHandler? onNotificationRead,
    SocketPayloadHandler? onActivityLogged,
    SocketPayloadHandler? onPresenceUpdated,
  }) {
    final signature = '$userId|${workspaceId ?? ''}|${token.hashCode}';
    if (_socket != null && _signature == signature && _socket!.connected) {
      return;
    }

    // Eski workspace odasını bırak / bağlantıyı kapat.
    leaveWorkspaceRoom();
    disconnect();
    _signature = signature;

    final query = <String, dynamic>{
      'userId': userId,
      if (workspaceId != null && workspaceId.isNotEmpty)
        'workspaceId': workspaceId,
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

    final socket = io.io(ApiConstants.baseUrl, options);
    _socket = socket;

    socket.onConnect((_) {
      debugPrint('[Socket] connected ${socket.id}');
      if (workspaceId != null && workspaceId.isNotEmpty) {
        _joinedWorkspaceId = workspaceId;
        // Sunucu handshake.query ile join eder; ekstra leave için id tutuyoruz.
      }
    });
    socket.onDisconnect((_) {
      debugPrint('[Socket] disconnected');
      _joinedWorkspaceId = null;
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
    if (onNotificationRead != null) {
      // Başka bir cihazda (ör. web'de) okundu işaretlenen/tümü-okundu
      // yapılan bildirimlerin bu cihazda da anlık yansıması için —
      // önceden yalnızca YENİ bildirim event'i dinleniyordu, "okundu"
      // event'leri hiç dinlenmiyordu (mobil-web parite denetiminde bulundu,
      // 22 Ağustos 2026).
      socket.on('notification_read', onNotificationRead);
      socket.on('notifications_read_all', onNotificationRead);
    }
    if (onActivityLogged != null) {
      socket.on('activity_logged', onActivityLogged);
    }
    if (onPresenceUpdated != null) {
      socket.on('presence_updated', onPresenceUpdated);
    }
  }

  /// Aktif workspace silindiğinde / değiştiğinde eski odayı bırak.
  void leaveWorkspaceRoom() {
    final socket = _socket;
    final oldId = _joinedWorkspaceId;
    _joinedWorkspaceId = null;
    if (socket == null || oldId == null) return;
    try {
      socket.emit('leave_workspace', {'workspaceId': oldId});
      debugPrint('[Socket] left workspace room $oldId');
    } catch (error) {
      debugPrint('[Socket] leave room error: $error');
    }
  }

  void disconnect() {
    leaveWorkspaceRoom();
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
