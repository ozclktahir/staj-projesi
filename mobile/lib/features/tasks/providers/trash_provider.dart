import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../workspace/providers/workspace_provider.dart';
import '../data/task_dto.dart';
import 'task_provider.dart';

final trashProvider =
    AsyncNotifierProvider.autoDispose<TrashNotifier, List<TaskDto>>(
  TrashNotifier.new,
);

class TrashNotifier extends AutoDisposeAsyncNotifier<List<TaskDto>> {
  @override
  Future<List<TaskDto>> build() async {
    final workspaceId = ref.watch(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null || workspaceId.isEmpty) {
      return const [];
    }
    return ref.read(taskRepositoryProvider).fetchDeletedTasks(
          workspaceId: workspaceId,
        );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }

  Future<void> restore(String taskId) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return;
    await ref.read(taskRepositoryProvider).restoreTask(
          workspaceId: workspaceId,
          taskId: taskId,
        );
    final current = state.valueOrNull ?? const <TaskDto>[];
    state = AsyncData([
      for (final t in current)
        if (t.id != taskId) t,
    ]);
    ref.invalidate(tasksProvider);
  }
}
