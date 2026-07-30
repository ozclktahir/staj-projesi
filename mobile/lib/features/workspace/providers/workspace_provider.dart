import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants/storage_keys.dart';
import '../../../core/network/api_client_provider.dart';
import '../../../core/storage/shared_preferences_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/workspace_dto.dart';
import '../data/workspace_repository.dart';

@immutable
class WorkspaceState {
  const WorkspaceState({
    this.workspaces = const [],
    this.activeWorkspace,
    this.isLoading = false,
    this.isSubmitting = false,
    this.errorMessage,
  });

  final List<WorkspaceDto> workspaces;
  final WorkspaceDto? activeWorkspace;
  final bool isLoading;
  final bool isSubmitting;
  final String? errorMessage;

  WorkspaceState copyWith({
    List<WorkspaceDto>? workspaces,
    WorkspaceDto? activeWorkspace,
    bool? isLoading,
    bool? isSubmitting,
    String? errorMessage,
    bool clearActive = false,
    bool clearError = false,
  }) {
    return WorkspaceState(
      workspaces: workspaces ?? this.workspaces,
      activeWorkspace:
          clearActive ? null : (activeWorkspace ?? this.activeWorkspace),
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class WorkspaceNotifier extends StateNotifier<WorkspaceState> {
  WorkspaceNotifier({
    required this.repository,
    required this.prefs,
  }) : super(const WorkspaceState(isLoading: true));

  final WorkspaceRepository repository;
  final SharedPreferences prefs;

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final list = await repository.fetchWorkspaces();
      final savedId = prefs.getString(StorageKeys.activeWorkspaceId);
      final active = _resolveActive(list, savedId);
      if (active != null) {
        await prefs.setString(StorageKeys.activeWorkspaceId, active.id);
      } else {
        await prefs.remove(StorageKeys.activeWorkspaceId);
      }
      state = WorkspaceState(
        workspaces: list,
        activeWorkspace: active,
        isLoading: false,
      );
    } on WorkspaceException catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.message,
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Çalışma alanları yüklenemedi.',
      );
    }
  }

  Future<void> selectWorkspace(String workspaceId) async {
    WorkspaceDto? match;
    for (final workspace in state.workspaces) {
      if (workspace.id == workspaceId) {
        match = workspace;
        break;
      }
    }
    if (match == null) return;

    await prefs.setString(StorageKeys.activeWorkspaceId, match.id);
    state = state.copyWith(activeWorkspace: match, clearError: true);
  }

  Future<bool> createWorkspace({
    required String name,
    String? description,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final created = await repository.createWorkspace(
        CreateWorkspaceDto(name: name, description: description),
      );
      final list = [...state.workspaces, created];
      await prefs.setString(StorageKeys.activeWorkspaceId, created.id);
      state = WorkspaceState(
        workspaces: list,
        activeWorkspace: created,
        isLoading: false,
        isSubmitting: false,
      );
      return true;
    } on WorkspaceException catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: error.message,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Çalışma alanı oluşturulamadı.',
      );
      return false;
    }
  }

  void resetLocal() {
    state = const WorkspaceState(isLoading: false);
  }

  /// 403 / silme sonrası: aktif workspace stale ise temizle.
  void handleWorkspaceAccessForbidden(String? workspaceId) {
    final activeId = state.activeWorkspace?.id;
    if (activeId == null) return;
    if (workspaceId != null && workspaceId != activeId) return;

    unawaited(prefs.remove(StorageKeys.activeWorkspaceId));
    final remaining = [
      for (final workspace in state.workspaces)
        if (workspace.id != activeId) workspace,
    ];
    state = WorkspaceState(
      workspaces: remaining,
      activeWorkspace: remaining.isEmpty ? null : remaining.first,
      isLoading: false,
      isSubmitting: false,
    );
    if (state.activeWorkspace != null) {
      unawaited(
        prefs.setString(
          StorageKeys.activeWorkspaceId,
          state.activeWorkspace!.id,
        ),
      );
    }
  }

  Future<bool> deleteWorkspace(String workspaceId) async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    final wasActive = state.activeWorkspace?.id == workspaceId;

    // Önce aktif workspace'i düşür — provider'lar eski id ile istek atmasın.
    if (wasActive) {
      await prefs.remove(StorageKeys.activeWorkspaceId);
      state = state.copyWith(
        clearActive: true,
        isSubmitting: true,
        clearError: true,
      );
    }

    try {
      await repository.deleteWorkspace(workspaceId);
      final remaining = [
        for (final workspace in state.workspaces)
          if (workspace.id != workspaceId) workspace,
      ];
      final nextActive = remaining.isEmpty ? null : remaining.first;
      if (nextActive != null) {
        await prefs.setString(StorageKeys.activeWorkspaceId, nextActive.id);
      } else {
        await prefs.remove(StorageKeys.activeWorkspaceId);
      }
      state = WorkspaceState(
        workspaces: remaining,
        activeWorkspace: nextActive,
        isLoading: false,
        isSubmitting: false,
      );
      return true;
    } on WorkspaceException catch (error) {
      // Silme başarısızsa ve aktif'i temizlediysek listeyi yenilemeyi dene.
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: error.message,
      );
      await refresh();
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Çalışma alanı silinemedi.',
      );
      await refresh();
      return false;
    }
  }

  WorkspaceDto? _resolveActive(List<WorkspaceDto> list, String? savedId) {
    if (list.isEmpty) return null;
    if (savedId != null) {
      for (final workspace in list) {
        if (workspace.id == savedId) return workspace;
      }
    }
    return list.first;
  }
}

final workspaceRepositoryProvider = Provider<WorkspaceRepository>((ref) {
  return WorkspaceRepository(apiClient: ref.watch(apiClientProvider));
});

final workspaceProvider =
    StateNotifierProvider<WorkspaceNotifier, WorkspaceState>((ref) {
  final notifier = WorkspaceNotifier(
    repository: ref.watch(workspaceRepositoryProvider),
    prefs: ref.watch(sharedPreferencesProvider),
  );

  // Token Dio belleğine yazılsın, sonra /workspace çağrılsın.
  ref.listen<AuthState>(
    authProvider,
    (previous, next) {
      if (next.status == AuthStatus.unknown) return;

      final client = ref.read(apiClientProvider);
      client.updateAccessToken(next.token);

      if (next.status == AuthStatus.authenticated) {
        final token = next.token;
        if (token == null || token.isEmpty) {
          notifier.resetLocal();
          return;
        }
        if (previous?.status != AuthStatus.authenticated ||
            previous?.token != next.token) {
          notifier.refresh();
        }
      } else if (next.status == AuthStatus.unauthenticated) {
        notifier.resetLocal();
      }
    },
    fireImmediately: true,
  );

  return notifier;
});
