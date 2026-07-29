import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/workspace/providers/workspace_provider.dart';
import 'realtime_provider.dart';
import 'workspace_session_cleanup.dart';

/// Aktif workspace id değişince (silme / switch) bağımlı state + socket odasını temizler.
final workspaceScopeSyncProvider = Provider<void>((ref) {
  ref.listen<String?>(
    workspaceProvider.select((s) => s.activeWorkspace?.id),
    (previous, next) {
      if (previous == next) return;
      if (previous != null) {
        ref.read(socketServiceProvider).leaveWorkspaceRoom();
        invalidateWorkspaceScopedProviders(ref);
      }
    },
  );
});
