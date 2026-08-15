import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/task_repository.dart';
import '../data/task_scope.dart';
import 'task_provider.dart' show taskRepositoryProvider;

/// Görevin ek atananları (task_assignees) — birincil `assignee_id`'ye ek
/// katman. Web'deki 12 Ağustos çoklu atama özelliğinin mobil karşılığı.
class TaskAssigneesNotifier extends AutoDisposeFamilyAsyncNotifier<
    List<TaskAssigneeOption>, TaskScope> {
  @override
  Future<List<TaskAssigneeOption>> build(TaskScope scope) {
    return ref.read(taskRepositoryProvider).getAssignees(
          workspaceId: scope.workspaceId,
          taskId: scope.taskId,
        );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(taskRepositoryProvider).getAssignees(
            workspaceId: arg.workspaceId,
            taskId: arg.taskId,
          ),
    );
  }

  /// Yalnızca admin/OWNER çağırabilir (backend de aynı kuralı uygular).
  Future<void> setAssignees(List<String> userIds) async {
    final previous = state.valueOrNull ?? const <TaskAssigneeOption>[];
    try {
      final updated = await ref.read(taskRepositoryProvider).setAssignees(
            workspaceId: arg.workspaceId,
            taskId: arg.taskId,
            userIds: userIds,
          );
      state = AsyncData(updated);
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }
}

final taskAssigneesProvider = AsyncNotifierProvider.autoDispose
    .family<TaskAssigneesNotifier, List<TaskAssigneeOption>, TaskScope>(
  TaskAssigneesNotifier.new,
);
