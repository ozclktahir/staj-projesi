import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/workspace/providers/workspace_provider.dart';
import '../storage/secure_storage_provider.dart';
import 'api_client.dart';
import 'workspace_access_bus.dart';
import 'workspace_session_cleanup.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(secureStorage: ref.watch(secureStorageProvider));
});

/// Dio 403 bus dinleyicisi — aktif workspace stale ise temizler.
final workspaceForbiddenListenerProvider = Provider<void>((ref) {
  final sub = WorkspaceAccessBus.instance.stream.listen((workspaceId) {
    scheduleMicrotask(() {
      try {
        ref
            .read(workspaceProvider.notifier)
            .handleWorkspaceAccessForbidden(workspaceId);
        invalidateWorkspaceScopedProviders(ref);
      } catch (error, stack) {
        debugPrint('[WorkspaceForbidden] handler failed: $error\n$stack');
      }
    });
  });
  ref.onDispose(sub.cancel);
});
