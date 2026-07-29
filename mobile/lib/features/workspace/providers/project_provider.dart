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
    return ref.read(projectRepositoryProvider).fetchProjects(workspaceId);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
      if (workspaceId == null) return const <ProjectDto>[];
      return ref.read(projectRepositoryProvider).fetchProjects(workspaceId);
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
}

final projectsProvider =
    AsyncNotifierProvider<ProjectsNotifier, List<ProjectDto>>(
  ProjectsNotifier.new,
);
