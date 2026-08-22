import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../data/workspace_member_dto.dart';
import '../data/workspace_members_repository.dart';
import 'workspace_provider.dart';

final workspaceMembersRepositoryProvider =
    Provider<WorkspaceMembersRepository>((ref) {
  return WorkspaceMembersRepository(apiClient: ref.watch(apiClientProvider));
});

/// Aktif workspace üyeleri.
///
/// Backend `listMembers` (bkz. `workspace.service.ts`) artık RLS
/// (`fix_workspace_members_select_all.sql`, 12/15 Ağustos) sayesinde rolden
/// bağımsız olarak TÜM üyeleri döndürüyor — web'deki "üyeler sayfası
/// herkese açık" değişikliğinin sunucu tarafı karşılığı. Burada önceden
/// admin olmayanlar için listeyi kendisiyle sınırlayan bir client-side
/// filtre vardı; bu artık backend'in döndürdüğü veriyle çelişiyordu
/// (üye listesi ekranını ve dashboard'daki üye sayısını admin olmayan
/// kullanıcılar için yanlış/eksik gösteriyordu, ve AssigneesField'da
/// admin olmayanların web'deki gibi başka bir üyeyi tek atanan olarak
/// seçebilmesini de engelliyordu). Filtre kaldırıldı; RLS zaten gerçek
/// yetkilendirme katmanı.
final workspaceMembersProvider =
    FutureProvider<List<WorkspaceMemberDto>>((ref) async {
  final workspaceId = ref.watch(
    workspaceProvider.select((s) => s.activeWorkspace?.id),
  );
  if (workspaceId == null) return const [];

  final response = await ref
      .read(workspaceMembersRepositoryProvider)
      .fetchMembers(workspaceId);

  return response.members;
});

/// Üye id → görünen ad haritası (kart / detay etiketleri).
final workspaceMemberLabelMapProvider = Provider<Map<String, String>>((ref) {
  final members = ref.watch(workspaceMembersProvider).valueOrNull ?? const [];
  return {
    for (final member in members) member.id: member.label,
  };
});
