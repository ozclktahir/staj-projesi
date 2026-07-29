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
    onActivityLogged: (_) {
      onRealtimeEvent(() {
        scheduleInvalidate(activityLogProvider);
      });
    },
  );

  ref.onDispose(() {
    debounce?.cancel();
    socket.disconnect();
  });
});
