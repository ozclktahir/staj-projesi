import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/create_task_dto.dart';
import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../data/update_task_dto.dart';

final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return TaskRepository(apiClient: ref.watch(apiClientProvider));
});

/// Seçili projeye ait görevler — [projectId] family argümanı.
class TasksNotifier
    extends AutoDisposeFamilyAsyncNotifier<List<TaskDto>, String> {
  @override
  Future<List<TaskDto>> build(String projectId) async {
    final workspaceId = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace?.id),
    );
    if (workspaceId == null) return const [];
    return ref.read(taskRepositoryProvider).fetchTasks(
          workspaceId: workspaceId,
          projectId: projectId,
        );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
      if (workspaceId == null) return const <TaskDto>[];
      return ref.read(taskRepositoryProvider).fetchTasks(
            workspaceId: workspaceId,
            projectId: arg,
          );
    });
  }

  Future<bool> createTask({
    required String title,
    String? description,
    TaskStatus status = TaskStatus.todo,
    TaskPriority priority = TaskPriority.medium,
    String? assigneeId,
    String? dueDate,
  }) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return false;

    final created = await ref.read(taskRepositoryProvider).createTask(
          workspaceId: workspaceId,
          dto: CreateTaskDto(
            title: title,
            description: description,
            status: status,
            priority: priority,
            assigneeId: assigneeId,
            dueDate: dueDate,
            projectId: arg,
          ),
        );
    final current = state.valueOrNull ?? const <TaskDto>[];
    state = AsyncData([created, ...current]);
    return true;
  }

  Future<TaskDto> updateTask({
    required String taskId,
    required UpdateTaskDto dto,
  }) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) {
      throw TaskException('Aktif çalışma alanı yok.');
    }

    final previous = state.valueOrNull ?? const <TaskDto>[];
    final updated = await ref.read(taskRepositoryProvider).updateTask(
          workspaceId: workspaceId,
          taskId: taskId,
          dto: dto,
        );
    state = AsyncData([
      for (final task in previous)
        if (task.id == taskId) updated else task,
    ]);
    return updated;
  }

  /// Anında UI güncellemesi + hata durumunda geri alma.
  Future<void> updateStatus(String taskId, TaskStatus status) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return;

    final previous = state.valueOrNull ?? const <TaskDto>[];
    state = AsyncData([
      for (final task in previous)
        if (task.id == taskId) task.copyWith(status: status) else task,
    ]);

    try {
      final updated = await ref.read(taskRepositoryProvider).updateTask(
            workspaceId: workspaceId,
            taskId: taskId,
            dto: UpdateTaskDto(status: status),
          );
      final latest = state.valueOrNull ?? previous;
      state = AsyncData([
        for (final task in latest)
          if (task.id == taskId) updated else task,
      ]);
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }

  Future<void> deleteTask(String taskId) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return;

    final previous = state.valueOrNull ?? const <TaskDto>[];
    state = AsyncData([
      for (final task in previous)
        if (task.id != taskId) task,
    ]);

    try {
      await ref.read(taskRepositoryProvider).deleteTask(
            workspaceId: workspaceId,
            taskId: taskId,
          );
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }
}

final tasksProvider =
    AsyncNotifierProvider.autoDispose.family<TasksNotifier, List<TaskDto>, String>(
  TasksNotifier.new,
);
