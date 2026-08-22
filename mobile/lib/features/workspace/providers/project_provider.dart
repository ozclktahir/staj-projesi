import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../../core/rbac/workspace_rbac.dart';
import '../../auth/providers/auth_provider.dart';
import '../../tasks/data/task_dto.dart';
import '../../tasks/data/task_repository.dart';
import '../../tasks/providers/task_provider.dart';
import '../data/project_dto.dart';
import '../data/project_repository.dart';
import 'workspace_provider.dart';

final projectRepositoryProvider = Provider<ProjectRepository>((ref) {
  return ProjectRepository(apiClient: ref.watch(apiClientProvider));
});

/// Aktif workspace değişince projeleri otomatik yeniden yükler.
/// Non-admin üyeler için web `getMemberVisibleProjectIds` mantığı uygulanır.
class ProjectsNotifier extends AsyncNotifier<List<ProjectDto>> {
  @override
  Future<List<ProjectDto>> build() async {
    final workspace = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace),
    );
    final userId = ref.watch(authProvider.select((s) => s.userId));
    if (workspace == null) return const [];
    return _fetchVisibleProjects(
      workspaceId: workspace.id,
      role: workspace.role,
      ownerId: workspace.ownerId,
      userId: userId,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final workspace = ref.read(workspaceProvider).activeWorkspace;
      final userId = ref.read(authProvider).userId;
      if (workspace == null) return const <ProjectDto>[];
      try {
        return await _fetchVisibleProjects(
          workspaceId: workspace.id,
          role: workspace.role,
          ownerId: workspace.ownerId,
          userId: userId,
        );
      } on ProjectException {
        return const <ProjectDto>[];
      }
    });
  }

  /// Projeleri ve (Member/Guest için) atanan görev listesini PARALEL çeker
  /// — ikisi de yalnızca workspaceId/userId'ye bağlı, birbirinin sonucuna
  /// değil (dashboard_provider.dart'taki stats+tasks düzeltmesiyle aynı
  /// desen; önceden projeler bitmeden görev sorgusu hiç başlamıyordu).
  Future<List<ProjectDto>> _fetchVisibleProjects({
    required String workspaceId,
    required String? role,
    required String? ownerId,
    required String? userId,
  }) async {
    final caps = WorkspaceCapabilities.resolve(
      role: role,
      ownerId: ownerId,
      userId: userId,
    );
    final needsTaskVisibility =
        !caps.isAdmin && userId != null && userId.isNotEmpty;

    Future<List<TaskDto>> loadAssignedTasks() async {
      if (!needsTaskVisibility) return const [];
      try {
        return await ref
            .read(taskRepositoryProvider)
            .fetchTasks(
              workspaceId: workspaceId,
              assigneeId: userId,
              limit: 200,
            );
      } on TaskException catch (error) {
        debugPrint('[Projects] member visibility tasks: $error');
        return const [];
      }
    }

    final (projects, assignedTasks) = await (
      ref.read(projectRepositoryProvider).fetchProjects(workspaceId),
      loadAssignedTasks(),
    ).wait;

    if (!needsTaskVisibility) return projects;

    final visibleIds = <String>{
      for (final project in projects)
        if (project.isLinkedToUser(userId)) project.id,
    };
    for (final task in assignedTasks) {
      final projectId = task.projectId;
      if (projectId != null && projectId.isNotEmpty) {
        visibleIds.add(projectId);
      }
    }

    if (visibleIds.isEmpty) return const [];
    return [
      for (final project in projects)
        if (visibleIds.contains(project.id)) project,
    ];
  }

  Future<bool> createProject({
    required String name,
    String? description,
  }) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return false;

    try {
      final created = await ref
          .read(projectRepositoryProvider)
          .createProject(
            workspaceId: workspaceId,
            dto: CreateProjectDto(name: name, description: description),
          );
      final current = state.valueOrNull ?? const <ProjectDto>[];
      state = AsyncData([...current, created]);
      return true;
    } on ProjectException {
      rethrow;
    }
  }

  Future<void> deleteProject(String projectId) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) {
      throw ProjectException('Aktif çalışma alanı yok.');
    }

    final previous = state.valueOrNull ?? const <ProjectDto>[];
    state = AsyncData([
      for (final project in previous)
        if (project.id != projectId) project,
    ]);

    try {
      await ref
          .read(projectRepositoryProvider)
          .deleteProject(workspaceId: workspaceId, projectId: projectId);
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }
}

final projectsProvider =
    AsyncNotifierProvider<ProjectsNotifier, List<ProjectDto>>(
      ProjectsNotifier.new,
    );
