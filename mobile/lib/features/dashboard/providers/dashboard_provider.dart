import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../tasks/data/task_dto.dart';
import '../../tasks/data/task_repository.dart';
import '../../tasks/providers/task_provider.dart';
import '../../workspace/providers/workspace_members_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/dashboard_repository.dart';
import '../data/workspace_statistics_dto.dart';
import 'dashboard_models.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(apiClient: ref.watch(apiClientProvider));
});

/// Nest istatistikleri + görev listesinden türetilen KPI / grafik / deadline’lar.
final dashboardProvider =
    AsyncNotifierProvider.autoDispose<DashboardNotifier, DashboardData>(
  DashboardNotifier.new,
);

class DashboardNotifier extends AutoDisposeAsyncNotifier<DashboardData> {
  @override
  Future<DashboardData> build() async {
    final workspaceId = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace?.id),
    );
    if (workspaceId == null) return DashboardData.empty();

    // Üye etiketleri / sayısı (workload + Aktif Üyeler KPI).
    final membersAsync = ref.watch(workspaceMembersProvider);
    final members = membersAsync.valueOrNull ?? const [];
    final memberLabels = {
      for (final m in members) m.id: m.label,
    };

    WorkspaceStatisticsDto? remote;
    try {
      remote = await ref
          .read(dashboardRepositoryProvider)
          .fetchStatistics(workspaceId);
    } catch (_) {
      remote = null;
    }

    List<TaskDto> tasks = const [];
    try {
      tasks = await ref.read(taskRepositoryProvider).fetchTasks(
            workspaceId: workspaceId,
            limit: 200,
          );
    } on TaskException catch (error) {
      // 403 / ağ hatalarında ekranı düşürme
      debugPrint('[Dashboard] tasks fetch: $error');
      tasks = const [];
    }

    return DashboardData.fromTasks(
      List<TaskDto>.from(tasks),
      remote: remote,
      memberLabels: memberLabels,
      memberCount: members.length,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }
}
