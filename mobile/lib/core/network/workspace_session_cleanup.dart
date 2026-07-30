import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/activity/providers/activity_log_provider.dart';
import '../../features/dashboard/providers/dashboard_provider.dart';
import '../../features/notifications/providers/notification_provider.dart';
import '../../features/personal/providers/personal_tasks_provider.dart';
import '../../features/tasks/providers/task_provider.dart';
import '../../features/workspace/providers/project_provider.dart';
import '../../features/workspace/providers/workspace_members_provider.dart';

/// Aktif workspace değişince / silinince eski id ile istek atan provider'ları temizler.
void invalidateWorkspaceScopedProviders(Ref ref) {
  void safe(Object provider) {
    try {
      ref.invalidate(provider as ProviderOrFamily);
    } catch (error) {
      debugPrint('[WorkspaceCleanup] invalidate failed: $error');
    }
  }

  safe(projectsProvider);
  safe(dashboardProvider);
  safe(notificationsProvider);
  safe(personalTasksProvider);
  safe(tasksProvider);
  safe(activityLogProvider);
  safe(workspaceMembersProvider);
}

/// WidgetRef için aynı temizlik.
void invalidateWorkspaceScopedProvidersWithWidgetRef(WidgetRef ref) {
  void safe(Object provider) {
    try {
      ref.invalidate(provider as ProviderOrFamily);
    } catch (error) {
      debugPrint('[WorkspaceCleanup] invalidate failed: $error');
    }
  }

  safe(projectsProvider);
  safe(dashboardProvider);
  safe(notificationsProvider);
  safe(personalTasksProvider);
  safe(tasksProvider);
  safe(activityLogProvider);
  safe(workspaceMembersProvider);
}
