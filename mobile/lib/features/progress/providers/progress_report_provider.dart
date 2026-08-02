import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/progress_report_repository.dart';

final progressReportRepositoryProvider = Provider<ProgressReportRepository>((
  ref,
) {
  return ProgressReportRepository(apiClient: ref.watch(apiClientProvider));
});

final progressReportsProvider = AsyncNotifierProvider.autoDispose<
    ProgressReportsNotifier, List<ProgressReportDto>>(
  ProgressReportsNotifier.new,
);

class ProgressReportsNotifier
    extends AutoDisposeAsyncNotifier<List<ProgressReportDto>> {
  @override
  Future<List<ProgressReportDto>> build() async {
    final workspaceId = ref.watch(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null || workspaceId.isEmpty) return const [];
    return ref.read(progressReportRepositoryProvider).fetchReports(workspaceId);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }

  Future<void> create({
    required String reportType,
    required String title,
    required String content,
  }) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) {
      throw ProgressReportException('Workspace seçilmedi.');
    }
    final created = await ref.read(progressReportRepositoryProvider).create(
          workspaceId: workspaceId,
          reportType: reportType,
          title: title,
          content: content,
        );
    final current = state.valueOrNull ?? const <ProgressReportDto>[];
    state = AsyncData([created, ...current]);
  }

  Future<void> remove(String reportId) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return;
    await ref.read(progressReportRepositoryProvider).delete(
          workspaceId: workspaceId,
          reportId: reportId,
        );
    final current = state.valueOrNull ?? const <ProgressReportDto>[];
    state = AsyncData([
      for (final r in current)
        if (r.id != reportId) r,
    ]);
  }
}
