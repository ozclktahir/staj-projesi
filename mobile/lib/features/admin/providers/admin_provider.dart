import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/admin_repository.dart';

final adminRepositoryProvider = Provider<AdminRepository>((ref) {
  return AdminRepository(apiClient: ref.watch(apiClientProvider));
});

final adminStatsProvider =
    AsyncNotifierProvider.autoDispose<AdminStatsNotifier, AdminStatsDto>(
  AdminStatsNotifier.new,
);

class AdminStatsNotifier extends AutoDisposeAsyncNotifier<AdminStatsDto> {
  @override
  Future<AdminStatsDto> build() async {
    final workspaceId = ref.watch(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null || workspaceId.isEmpty) {
      throw AdminException('Workspace seçilmedi.');
    }
    return ref.read(adminRepositoryProvider).fetchStats(workspaceId);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }
}
