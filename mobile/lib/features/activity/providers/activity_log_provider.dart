import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/activity_log_dto.dart';
import '../data/activity_log_repository.dart';

final activityLogRepositoryProvider = Provider<ActivityLogRepository>((ref) {
  return ActivityLogRepository(apiClient: ref.watch(apiClientProvider));
});

/// Workspace aktivite akışı. [projectId] verilirse projeye özel filtre uygulanır.
class ActivityLogNotifier
    extends AutoDisposeFamilyAsyncNotifier<List<ActivityLogDto>, String?> {
  @override
  Future<List<ActivityLogDto>> build(String? projectId) async {
    final workspaceId = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace?.id),
    );
    if (workspaceId == null) return const [];

    final all = await ref
        .read(activityLogRepositoryProvider)
        .fetchActivityLogs(workspaceId);

    if (projectId == null || projectId.isEmpty) {
      return all;
    }

    final filtered = all
        .where(
          (log) =>
              log.projectId == projectId ||
              (log.entityType == 'project' && log.entityId == projectId),
        )
        .toList();

    // Proje filtresi boşsa workspace akışını göster (eski kayıtlarda project_id olmayabilir).
    return filtered.isNotEmpty ? filtered : all;
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
      if (workspaceId == null) return const <ActivityLogDto>[];

      final all = await ref
          .read(activityLogRepositoryProvider)
          .fetchActivityLogs(workspaceId);

      final projectId = arg;
      if (projectId == null || projectId.isEmpty) return all;

      final filtered = all
          .where(
            (log) =>
                log.projectId == projectId ||
                (log.entityType == 'project' && log.entityId == projectId),
          )
          .toList();
      return filtered.isNotEmpty ? filtered : all;
    });
  }
}

final activityLogProvider = AsyncNotifierProvider.autoDispose
    .family<ActivityLogNotifier, List<ActivityLogDto>, String?>(
  ActivityLogNotifier.new,
);
