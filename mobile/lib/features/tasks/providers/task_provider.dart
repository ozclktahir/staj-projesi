import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/create_task_dto.dart';
import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../data/update_task_dto.dart';
import 'kanban_filter_provider.dart';

final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return TaskRepository(apiClient: ref.watch(apiClientProvider));
});

/// Proje görev listesi + sayfalama meta bilgisi.
class ProjectTasksState {
  const ProjectTasksState({
    required this.items,
    this.page = 1,
    this.totalPages = 1,
    this.total = 0,
    this.isLoadingMore = false,
  });

  final List<TaskDto> items;
  final int page;
  final int totalPages;
  final int total;
  final bool isLoadingMore;

  bool get hasMore => page < totalPages;

  ProjectTasksState copyWith({
    List<TaskDto>? items,
    int? page,
    int? totalPages,
    int? total,
    bool? isLoadingMore,
  }) {
    return ProjectTasksState(
      items: items ?? this.items,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      total: total ?? this.total,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }
}

/// Seçili projeye ait görevler — [projectId] family argümanı.
class TasksNotifier
    extends AutoDisposeFamilyAsyncNotifier<ProjectTasksState, String> {
  static const _pageSize = TaskRepository.defaultPageSize;

  @override
  Future<ProjectTasksState> build(String projectId) async {
    final workspaceId = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace?.id),
    );
    final filter = ref.watch(kanbanFilterProvider(projectId));
    if (workspaceId == null) {
      return const ProjectTasksState(items: []);
    }
    try {
      return await _fetchPage(
        workspaceId: workspaceId,
        projectId: projectId,
        filter: filter,
        page: 1,
      );
    } on TaskException catch (error) {
      debugPrint('[Tasks] fetch: $error');
      // Yetki/ağ hatalarında ekranı çökertme; boş kolon + refresh mümkün
      return const ProjectTasksState(items: []);
    }
  }

  Future<ProjectTasksState> _fetchPage({
    required String workspaceId,
    required String projectId,
    required KanbanFilter filter,
    required int page,
    List<TaskDto> appendTo = const [],
  }) async {
    final result = await ref.read(taskRepositoryProvider).fetchTasksPage(
          workspaceId: workspaceId,
          projectId: projectId,
          search: filter.search.isEmpty ? null : filter.search,
          priority: filter.priority,
          page: page,
          limit: _pageSize,
        );
    final merged = page <= 1
        ? result.items
        : [...appendTo, ...result.items];
    // Aynı id'leri tekilleştir (optimistic create sonrası sayfa yüklemesi)
    final seen = <String>{};
    final unique = <TaskDto>[];
    for (final task in merged) {
      if (seen.add(task.id)) unique.add(task);
    }
    return ProjectTasksState(
      items: unique,
      page: result.meta.page,
      totalPages: result.meta.totalPages,
      total: result.meta.total,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
      if (workspaceId == null) {
        return const ProjectTasksState(items: []);
      }
      final filter = ref.read(kanbanFilterProvider(arg));
      return _fetchPage(
        workspaceId: workspaceId,
        projectId: arg,
        filter: filter,
        page: 1,
      );
    });
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.isLoadingMore) {
      return;
    }

    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return;

    state = AsyncData(current.copyWith(isLoadingMore: true));
    try {
      final filter = ref.read(kanbanFilterProvider(arg));
      final next = await _fetchPage(
        workspaceId: workspaceId,
        projectId: arg,
        filter: filter,
        page: current.page + 1,
        appendTo: current.items,
      );
      state = AsyncData(next);
    } catch (error) {
      // await edilmeyen loadMore çağrılarında unhandled exception önle
      state = AsyncData(current.copyWith(isLoadingMore: false));
      debugPrint('[Tasks] loadMore failed: $error');
    }
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
    if (workspaceId == null) {
      throw TaskException('Aktif çalışma alanı yok.');
    }
    if (arg.isEmpty) {
      throw TaskException('Proje seçilmedi; görev oluşturulamıyor.');
    }

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

    final current = state.valueOrNull ?? const ProjectTasksState(items: []);
    state = AsyncData(
      current.copyWith(
        items: [created, ...current.items],
        total: current.total + 1,
      ),
    );
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

    final previous = state.valueOrNull ?? const ProjectTasksState(items: []);
    final updated = await ref.read(taskRepositoryProvider).updateTask(
          workspaceId: workspaceId,
          taskId: taskId,
          dto: dto,
        );
    state = AsyncData(
      previous.copyWith(
        items: [
          for (final task in previous.items)
            if (task.id == taskId) updated else task,
        ],
      ),
    );
    return updated;
  }

  /// Anında UI güncellemesi + hata durumunda geri alma.
  Future<void> updateStatus(String taskId, TaskStatus status) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return;

    final previous = state.valueOrNull ?? const ProjectTasksState(items: []);
    state = AsyncData(
      previous.copyWith(
        items: [
          for (final task in previous.items)
            if (task.id == taskId) task.copyWith(status: status) else task,
        ],
      ),
    );

    try {
      final updated = await ref.read(taskRepositoryProvider).updateTask(
            workspaceId: workspaceId,
            taskId: taskId,
            dto: UpdateTaskDto(status: status),
          );
      final latest = state.valueOrNull ?? previous;
      state = AsyncData(
        latest.copyWith(
          items: [
            for (final task in latest.items)
              if (task.id == taskId) updated else task,
          ],
        ),
      );
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }

  Future<String> deleteTask(String taskId) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) {
      throw TaskException('Aktif çalışma alanı yok.');
    }

    final previous = state.valueOrNull ?? const ProjectTasksState(items: []);

    try {
      final result = await ref.read(taskRepositoryProvider).deleteTask(
            workspaceId: workspaceId,
            taskId: taskId,
          );
      final mode = result['mode'] as String? ?? 'deleted';
      final message = result['message'] as String? ?? 'Görev silindi.';
      final deletionStatus = result['deletionStatus'] as String?;

      if (mode == 'approval_requested') {
        state = AsyncData(
          previous.copyWith(
            items: [
              for (final task in previous.items)
                if (task.id == taskId)
                  task.copyWith(deletionStatus: deletionStatus)
                else
                  task,
            ],
          ),
        );
      } else {
        state = AsyncData(
          previous.copyWith(
            items: [
              for (final task in previous.items)
                if (task.id != taskId) task,
            ],
            total: previous.total > 0 ? previous.total - 1 : 0,
          ),
        );
      }
      return message;
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }
}

final tasksProvider = AsyncNotifierProvider.autoDispose
    .family<TasksNotifier, ProjectTasksState, String>(
  TasksNotifier.new,
);
