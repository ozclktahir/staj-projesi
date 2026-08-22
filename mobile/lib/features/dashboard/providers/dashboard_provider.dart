import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../../core/network/workspace_presence_provider.dart';
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

    // Canlı "Aktif Üyeler" — NestJS Socket.IO presence (bkz. CLAUDE.md
    // platform farkları notu). Hazır değilken null → statik üye sayısına düşer.
    final presence = ref.watch(workspacePresenceProvider);
    final onlineCount = presence.ready ? presence.onlineCount : null;

    // İstatistik ve görev listesi birbirinden bağımsız — sıra yerine
    // paralel çekiliyor (2 ayrı Dio isteği aynı anda gider). Her birinin
    // kendi hata yakalaması korunuyor.
    Future<WorkspaceStatisticsDto?> loadStatistics() async {
      try {
        return await ref
            .read(dashboardRepositoryProvider)
            .fetchStatistics(workspaceId);
      } catch (_) {
        return null;
      }
    }

    Future<List<TaskDto>> loadTasks() async {
      try {
        return await ref.read(taskRepositoryProvider).fetchTasks(
              workspaceId: workspaceId,
              limit: 200,
            );
      } on TaskException catch (error) {
        // 403 / ağ hatalarında ekranı düşürme
        debugPrint('[Dashboard] tasks fetch: $error');
        return const [];
      }
    }

    final (remote, tasks) = await (loadStatistics(), loadTasks()).wait;

    return DashboardData.fromTasks(
      List<TaskDto>.from(tasks),
      remote: remote,
      memberLabels: memberLabels,
      memberCount: members.length,
      onlineCount: onlineCount,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }
}
