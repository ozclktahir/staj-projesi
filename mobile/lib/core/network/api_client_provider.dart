import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/workspace/providers/workspace_provider.dart';
import '../storage/secure_storage_provider.dart';
import 'api_client.dart';
import 'auth_session_bus.dart';
import 'workspace_access_bus.dart';
import 'workspace_session_cleanup.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(secureStorage: ref.watch(secureStorageProvider));
});

/// Auth token → Dio bellek senkronu (workspace isteklerinden önce).
final authTokenSyncProvider = Provider<void>((ref) {
  final client = ref.watch(apiClientProvider);
  ref.listen<AuthState>(
    authProvider,
    (previous, next) {
      client.updateAccessToken(next.token);
    },
    fireImmediately: true,
  );
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

/// Dio 401 bus dinleyicisi — oturumu temizler; GoRouter /login'e yönlendirir.
final unauthorizedSessionListenerProvider = Provider<void>((ref) {
  final sub = AuthSessionBus.instance.stream.listen((_) {
    scheduleMicrotask(() async {
      try {
        final auth = ref.read(authProvider);
        if (auth.status == AuthStatus.unauthenticated) {
          // Token interceptor'da silinmiş olabilir; state'i yine de sabitle.
          ref.read(workspaceProvider.notifier).resetLocal();
          invalidateWorkspaceScopedProviders(ref);
          return;
        }
        await ref.read(authProvider.notifier).clearSessionLocally();
        ref.read(workspaceProvider.notifier).resetLocal();
        invalidateWorkspaceScopedProviders(ref);
      } catch (error, stack) {
        debugPrint('[Unauthorized] handler failed: $error\n$stack');
      }
    });
  });
  ref.onDispose(sub.cancel);
});
