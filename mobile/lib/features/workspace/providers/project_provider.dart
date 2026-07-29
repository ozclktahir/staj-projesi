import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../data/project_dto.dart';
import '../data/project_repository.dart';
import 'workspace_provider.dart';

final projectRepositoryProvider = Provider<ProjectRepository>((ref) {
  return ProjectRepository(apiClient: ref.watch(apiClientProvider));
});

/// Aktif workspace değişince projeleri otomatik yeniden yükler.
class ProjectsNotifier extends AsyncNotifier<List<ProjectDto>> {
  @override
  Future<List<ProjectDto>> build() async {
    final workspaceId = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace?.id),
    );
    if (workspaceId == null) return const [];
    try {
      return await ref.read(projectRepositoryProvider).fetchProjects(workspaceId);
    } on ProjectException catch (error) {
      debugPrint('[Projects] fetch: $error');
      return const [];
    }
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
      if (workspaceId == null) return const <ProjectDto>[];
      try {
        return await ref
            .read(projectRepositoryProvider)
            .fetchProjects(workspaceId);
      } on ProjectException {
        return const <ProjectDto>[];
      }
    });
  }

  Future<bool> createProject({
    required String name,
    String? description,
  }) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return false;

    try {
      final created = await ref.read(projectRepositoryProvider).createProject(
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
      await ref.read(projectRepositoryProvider).deleteProject(
            workspaceId: workspaceId,
            projectId: projectId,
          );
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
