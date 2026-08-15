import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Aktif workspace'te "şu an bağlı" kullanıcı id'leri — NestJS Socket.IO
/// gateway'inin `presence_updated` event'inden besleniyor (bkz.
/// `NotificationGateway.broadcastPresence`).
///
/// Web'in `useWorkspacePresence` (Supabase Realtime Presence) hook'uyla
/// AYNI AMACA hizmet eder ama farklı bir taşıma katmanı kullanır: mobil
/// zaten bu gateway'e bağlı olduğundan, web'in kullandığı Supabase Realtime
/// kanalına ayrıca bağlanmak (yeni bir SDK + kimlik bilgisi yüzeyi
/// eklemeyi gerektirir) yerine mevcut altyapı üzerinden gerçek-zamanlı bir
/// karşılık veriyor. Bilinçli platform farkı — bkz. CLAUDE.md.
@immutable
class WorkspacePresenceState {
  const WorkspacePresenceState({
    this.onlineUserIds = const {},
    this.ready = false,
  });

  final Set<String> onlineUserIds;

  /// İlk `presence_updated` event'i gelene kadar false — bu sırada UI
  /// statik üye sayısına düşmeli (web'deki `ready` alanıyla aynı sözleşme).
  final bool ready;

  int get onlineCount => onlineUserIds.length;
}

class WorkspacePresenceNotifier extends StateNotifier<WorkspacePresenceState> {
  WorkspacePresenceNotifier() : super(const WorkspacePresenceState());

  void update(Iterable<String> ids) {
    state = WorkspacePresenceState(onlineUserIds: {...ids}, ready: true);
  }

  void reset() {
    state = const WorkspacePresenceState();
  }
}

final workspacePresenceProvider =
    StateNotifierProvider<WorkspacePresenceNotifier, WorkspacePresenceState>(
  (ref) => WorkspacePresenceNotifier(),
);
