import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../data/subtask_repository.dart';
import '../data/task_dto.dart';
import '../data/task_scope.dart';

final subtaskRepositoryProvider = Provider<SubtaskRepository>((ref) {
  return SubtaskRepository(apiClient: ref.watch(apiClientProvider));
});

class SubtasksNotifier
    extends AutoDisposeFamilyAsyncNotifier<List<TaskDto>, TaskScope> {
  @override
  Future<List<TaskDto>> build(TaskScope scope) {
    return ref.read(subtaskRepositoryProvider).fetchSubtasks(
          workspaceId: scope.workspaceId,
          parentTaskId: scope.taskId,
        );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(subtaskRepositoryProvider).fetchSubtasks(
            workspaceId: arg.workspaceId,
            parentTaskId: arg.taskId,
          ),
    );
  }

  Future<void> addSubtask({
    required String title,
    String? projectId,
  }) async {
    final created = await ref.read(subtaskRepositoryProvider).createSubtask(
          workspaceId: arg.workspaceId,
          parentTaskId: arg.taskId,
          title: title,
          projectId: projectId,
        );
    final current = state.valueOrNull ?? const <TaskDto>[];
    state = AsyncData([...current, created]);
  }

  Future<void> toggle(String subtaskId, bool completed) async {
    final previous = state.valueOrNull ?? const <TaskDto>[];
    state = AsyncData([
      for (final task in previous)
        if (task.id == subtaskId)
          task.copyWith(
            status: completed ? TaskStatus.done : TaskStatus.todo,
          )
        else
          task,
    ]);

    try {
      final updated = await ref.read(subtaskRepositoryProvider).setCompleted(
            workspaceId: arg.workspaceId,
            subtaskId: subtaskId,
            completed: completed,
          );
      final latest = state.valueOrNull ?? previous;
      state = AsyncData([
        for (final task in latest)
          if (task.id == subtaskId) updated else task,
      ]);
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }
}

final subtasksProvider = AsyncNotifierProvider.autoDispose
    .family<SubtasksNotifier, List<TaskDto>, TaskScope>(
  SubtasksNotifier.new,
);
