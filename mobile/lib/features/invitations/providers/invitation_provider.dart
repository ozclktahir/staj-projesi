import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/invitation_dto.dart';
import '../data/invitation_repository.dart';

final invitationRepositoryProvider = Provider<InvitationRepository>((ref) {
  return InvitationRepository(apiClient: ref.watch(apiClientProvider));
});

class MyInvitationsNotifier
    extends AutoDisposeAsyncNotifier<List<InvitationDto>> {
  @override
  Future<List<InvitationDto>> build() {
    return ref.read(invitationRepositoryProvider).fetchMyInvitations();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(invitationRepositoryProvider).fetchMyInvitations(),
    );
  }

  Future<void> accept(String invitationId) async {
    final previous = state.valueOrNull ?? const <InvitationDto>[];
    state = AsyncData([
      for (final item in previous)
        if (item.id != invitationId) item,
    ]);

    try {
      await ref.read(invitationRepositoryProvider).accept(invitationId);
      await ref.read(workspaceProvider.notifier).refresh();
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }

  Future<void> reject(String invitationId) async {
    final previous = state.valueOrNull ?? const <InvitationDto>[];
    state = AsyncData([
      for (final item in previous)
        if (item.id != invitationId) item,
    ]);

    try {
      await ref.read(invitationRepositoryProvider).reject(invitationId);
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }

  Future<InvitationDto> sendInvite({
    required String workspaceId,
    required String email,
    required String role,
  }) async {
    final created = await ref.read(invitationRepositoryProvider).sendInvite(
          workspaceId: workspaceId,
          request: InviteMemberRequest(email: email, role: role),
        );
    return created;
  }
}

final myInvitationsProvider = AsyncNotifierProvider.autoDispose<
    MyInvitationsNotifier, List<InvitationDto>>(
  MyInvitationsNotifier.new,
);

final pendingInvitationCountProvider = Provider.autoDispose<int>((ref) {
  final async = ref.watch(myInvitationsProvider);
  return async.maybeWhen(
    data: (items) => items.where((i) => i.isPending).length,
    orElse: () => 0,
  );
});
