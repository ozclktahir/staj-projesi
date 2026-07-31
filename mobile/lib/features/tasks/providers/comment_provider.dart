import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../data/comment_dto.dart';
import '../data/comment_repository.dart';
import '../data/task_scope.dart';

final commentRepositoryProvider = Provider<CommentRepository>((ref) {
  return CommentRepository(apiClient: ref.watch(apiClientProvider));
});

class CommentsNotifier
    extends AutoDisposeFamilyAsyncNotifier<List<CommentDto>, TaskScope> {
  @override
  Future<List<CommentDto>> build(TaskScope scope) {
    return ref.read(commentRepositoryProvider).fetchComments(
          workspaceId: scope.workspaceId,
          taskId: scope.taskId,
        );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(commentRepositoryProvider).fetchComments(
            workspaceId: arg.workspaceId,
            taskId: arg.taskId,
          ),
    );
  }

  Future<void> addComment(String content) async {
    await ref.read(commentRepositoryProvider).addComment(
          workspaceId: arg.workspaceId,
          taskId: arg.taskId,
          dto: CreateCommentDto(content: content),
        );
    // Create response may omit author; refresh to load profile-enriched list.
    await refresh();
  }
}

final commentsProvider = AsyncNotifierProvider.autoDispose
    .family<CommentsNotifier, List<CommentDto>, TaskScope>(
  CommentsNotifier.new,
);
