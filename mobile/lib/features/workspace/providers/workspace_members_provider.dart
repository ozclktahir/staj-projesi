import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/workspace_member_dto.dart';
import '../data/workspace_members_repository.dart';
import 'workspace_capabilities_provider.dart';
import 'workspace_provider.dart';

final workspaceMembersRepositoryProvider =
    Provider<WorkspaceMembersRepository>((ref) {
  return WorkspaceMembersRepository(apiClient: ref.watch(apiClientProvider));
});

/// Aktif workspace üyeleri (API filtre + client-side güvenlik ağı).
final workspaceMembersProvider =
    FutureProvider<List<WorkspaceMemberDto>>((ref) async {
  final workspaceId = ref.watch(
    workspaceProvider.select((s) => s.activeWorkspace?.id),
  );
  if (workspaceId == null) return const [];

  final response = await ref
      .read(workspaceMembersRepositoryProvider)
      .fetchMembers(workspaceId);

  final caps = ref.watch(workspaceCapabilitiesProvider);
  final userId = ref.watch(authProvider.select((s) => s.userId));

  var members = response.members;
  if (!caps.isAdmin && userId != null) {
    members = [
      for (final member in members)
        if (member.id == userId) member,
    ];
  }
  return members;
});

/// Üye id → görünen ad haritası (kart / detay etiketleri).
final workspaceMemberLabelMapProvider = Provider<Map<String, String>>((ref) {
  final members = ref.watch(workspaceMembersProvider).valueOrNull ?? const [];
  return {
    for (final member in members) member.id: member.label,
  };
});
