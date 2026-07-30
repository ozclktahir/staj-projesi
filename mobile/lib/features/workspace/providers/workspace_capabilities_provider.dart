import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/rbac/workspace_rbac.dart';
import '../../auth/providers/auth_provider.dart';
import 'workspace_provider.dart';

/// Aktif workspace için rol tabanlı UI yetkileri.
final workspaceCapabilitiesProvider = Provider<WorkspaceCapabilities>((ref) {
  final active = ref.watch(
    workspaceProvider.select((s) => s.activeWorkspace),
  );
  final userId = ref.watch(authProvider.select((s) => s.userId));
  if (active == null) return const WorkspaceCapabilities.none();
  return WorkspaceCapabilities.resolve(
    role: active.role,
    ownerId: active.ownerId,
    userId: userId,
  );
});
