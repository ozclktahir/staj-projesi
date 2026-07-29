import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../data/file_dto.dart';
import '../data/file_repository.dart';
import '../data/task_scope.dart';

final fileRepositoryProvider = Provider<FileRepository>((ref) {
  return FileRepository(apiClient: ref.watch(apiClientProvider));
});

class TaskFilesNotifier
    extends AutoDisposeFamilyAsyncNotifier<List<TaskFileDto>, TaskScope> {
  @override
  Future<List<TaskFileDto>> build(TaskScope scope) {
    return ref.read(fileRepositoryProvider).fetchFiles(
          workspaceId: scope.workspaceId,
          taskId: scope.taskId,
        );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(fileRepositoryProvider).fetchFiles(
            workspaceId: arg.workspaceId,
            taskId: arg.taskId,
          ),
    );
  }

  Future<void> upload({
    required String fileName,
    String? filePath,
    Uint8List? bytes,
    String? mimeType,
  }) async {
    final created = await ref.read(fileRepositoryProvider).uploadAndAttach(
          workspaceId: arg.workspaceId,
          taskId: arg.taskId,
          fileName: fileName,
          filePath: filePath,
          bytes: bytes,
          mimeType: mimeType,
        );
    final current = state.valueOrNull ?? const <TaskFileDto>[];
    state = AsyncData([...current, created]);
  }
}

final taskFilesProvider = AsyncNotifierProvider.autoDispose
    .family<TaskFilesNotifier, List<TaskFileDto>, TaskScope>(
  TaskFilesNotifier.new,
);
