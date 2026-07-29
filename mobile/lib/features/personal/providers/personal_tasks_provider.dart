import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../tasks/data/task_dto.dart';
import '../../tasks/providers/task_provider.dart';
import '../../workspace/providers/workspace_provider.dart';

/// Aktif workspace'te current user'a atanmış görevler.
final personalTasksProvider =
    AsyncNotifierProvider.autoDispose<PersonalTasksNotifier, List<TaskDto>>(
  PersonalTasksNotifier.new,
);

class PersonalTasksNotifier extends AutoDisposeAsyncNotifier<List<TaskDto>> {
  @override
  Future<List<TaskDto>> build() async {
    final workspaceId = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace?.id),
    );
    final userId = ref.watch(authProvider.select((s) => s.userId));
    if (workspaceId == null || userId == null || userId.isEmpty) {
      return const [];
    }

    return ref.read(taskRepositoryProvider).fetchTasks(
          workspaceId: workspaceId,
          assigneeId: userId,
          limit: 100,
        );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }
}
