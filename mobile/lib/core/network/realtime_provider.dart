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
/// event gelince ilgili provider'ları yeniler.
final realtimeConnectionProvider = Provider<void>((ref) {
  final auth = ref.watch(authProvider);
  final workspaceId = ref.watch(
    workspaceProvider.select((s) => s.activeWorkspace?.id),
  );
  final socket = ref.watch(socketServiceProvider);

  if (auth.status != AuthStatus.authenticated ||
      auth.token == null ||
      auth.token!.isEmpty ||
      auth.userId == null ||
      auth.userId!.isEmpty) {
    socket.disconnect();
    return;
  }

  socket.connect(
    token: auth.token!,
    userId: auth.userId!,
    workspaceId: workspaceId,
    onTaskUpdated: (_) {
      ref.invalidate(tasksProvider);
      ref.invalidate(dashboardProvider);
      ref.invalidate(personalTasksProvider);
      ref.invalidate(projectsProvider);
    },
    onNewNotification: (_) {
      ref.invalidate(notificationsProvider);
      ref.invalidate(myInvitationsProvider);
    },
    onActivityLogged: (_) {
      ref.invalidate(activityLogProvider);
    },
  );

  ref.onDispose(socket.disconnect);
});
