import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/activity/providers/activity_log_provider.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/dashboard/providers/dashboard_provider.dart';
import '../../features/invitations/providers/invitation_provider.dart';
import '../../features/notifications/providers/notification_provider.dart';
import '../../features/personal/providers/personal_tasks_provider.dart';
import '../../features/tasks/providers/task_provider.dart';
import '../../features/workspace/providers/project_provider.dart';
import '../../features/workspace/providers/workspace_provider.dart';
import 'socket_service.dart';
import 'workspace_presence_provider.dart';

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService();
  ref.onDispose(service.disconnect);
  return service;
});

/// Auth + aktif workspace değişince socket bağlantısını yönetir;
/// event gelince ilgili provider'ları (build dışında) yeniler.
final realtimeConnectionProvider = Provider<void>((ref) {
  final authStatus = ref.watch(authProvider.select((s) => s.status));
  final token = ref.watch(authProvider.select((s) => s.token));
  final userId = ref.watch(authProvider.select((s) => s.userId));
  final workspaceId = ref.watch(
    workspaceProvider.select((s) => s.activeWorkspace?.id),
  );
  final socket = ref.watch(socketServiceProvider);
  // Bir kez yakalanıyor: onDispose içinde `ref.read(...)` çağırmak, bu
  // provider dependency-invalidation nedeniyle dispose edilirken Riverpod'un
  // "Cannot use ref functions after the dependency changed but before the
  // provider rebuilt" assertion'ını tetikliyordu. Notifier'ı doğrudan
  // tutup çağırmak (socket'te zaten yapılan pattern) bu sorunu ortadan kaldırır.
  final presence = ref.read(workspacePresenceProvider.notifier);

  Timer? debounce;

  void scheduleInvalidate(Object provider) {
    // Widget build / layout sırasında invalidate → markNeedsBuild hatalarını önle.
    scheduleMicrotask(() {
      try {
        ref.invalidate(provider as ProviderOrFamily);
      } catch (error, stack) {
        debugPrint('[Realtime] invalidate failed: $error\n$stack');
      }
    });
  }

  void onRealtimeEvent(void Function() action) {
    debounce?.cancel();
    debounce = Timer(const Duration(milliseconds: 250), () {
      try {
        action();
      } catch (error, stack) {
        debugPrint('[Realtime] handler failed: $error\n$stack');
      }
    });
  }

  if (authStatus != AuthStatus.authenticated ||
      token == null ||
      token.isEmpty ||
      userId == null ||
      userId.isEmpty) {
    socket.disconnect();
    presence.reset();
    ref.onDispose(() {
      debounce?.cancel();
      socket.disconnect();
    });
    return;
  }

  socket.connect(
    token: token,
    userId: userId,
    workspaceId: workspaceId,
    onTaskUpdated: (_) {
      onRealtimeEvent(() {
        scheduleInvalidate(tasksProvider);
        scheduleInvalidate(dashboardProvider);
        scheduleInvalidate(personalTasksProvider);
        scheduleInvalidate(projectsProvider);
      });
    },
    onNewNotification: (_) {
      onRealtimeEvent(() {
        scheduleInvalidate(notificationsProvider);
        scheduleInvalidate(myInvitationsProvider);
      });
    },
    onNotificationRead: (_) {
      onRealtimeEvent(() {
        scheduleInvalidate(notificationsProvider);
      });
    },
    onActivityLogged: (_) {
      onRealtimeEvent(() {
        scheduleInvalidate(activityLogProvider);
      });
    },
    onPresenceUpdated: (payload) {
      // Debounce'suz — presence anlık olmalı, KPI kartı tek int render eder.
      try {
        final map = payload is Map ? payload : <String, dynamic>{};
        final payloadWorkspaceId = map['workspaceId'] as String?;
        if (payloadWorkspaceId != null && payloadWorkspaceId != workspaceId) {
          return;
        }
        final raw = map['onlineUserIds'];
        final ids = raw is List ? raw.whereType<String>() : const <String>[];
        presence.update(ids);
      } catch (error, stack) {
        debugPrint('[Realtime] presence handler failed: $error\n$stack');
      }
    },
  );

  ref.onDispose(() {
    debounce?.cancel();
    socket.disconnect();
    presence.reset();
  });
});
