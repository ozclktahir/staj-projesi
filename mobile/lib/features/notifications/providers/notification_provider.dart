import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/notification_dto.dart';
import '../data/notification_repository.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(apiClient: ref.watch(apiClientProvider));
});

class NotificationsNotifier
    extends AutoDisposeAsyncNotifier<List<NotificationDto>> {
  @override
  Future<List<NotificationDto>> build() async {
    final workspaceId = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace?.id),
    );
    if (workspaceId == null) return const [];
    return ref
        .read(notificationRepositoryProvider)
        .fetchNotifications(workspaceId);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
      if (workspaceId == null) return const <NotificationDto>[];
      return ref
          .read(notificationRepositoryProvider)
          .fetchNotifications(workspaceId);
    });
  }

  Future<void> markAsRead(String notificationId) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return;

    final previous = state.valueOrNull ?? const <NotificationDto>[];
    state = AsyncData([
      for (final item in previous)
        if (item.id == notificationId) item.copyWith(isRead: true) else item,
    ]);

    try {
      final updated =
          await ref.read(notificationRepositoryProvider).markAsRead(
                workspaceId: workspaceId,
                notificationId: notificationId,
              );
      final latest = state.valueOrNull ?? previous;
      state = AsyncData([
        for (final item in latest)
          if (item.id == notificationId) updated else item,
      ]);
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }

  Future<void> markAllAsRead() async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return;

    final previous = state.valueOrNull ?? const <NotificationDto>[];
    state = AsyncData([
      for (final item in previous) item.copyWith(isRead: true),
    ]);

    try {
      await ref
          .read(notificationRepositoryProvider)
          .markAllAsRead(workspaceId);
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }

  Future<String> respondToClaim({
    required String notificationId,
    required String decision,
  }) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) {
      throw NotificationException('Aktif çalışma alanı yok.');
    }

    final result =
        await ref.read(notificationRepositoryProvider).respondToClaim(
              workspaceId: workspaceId,
              notificationId: notificationId,
              decision: decision,
            );

    final previous = state.valueOrNull ?? const <NotificationDto>[];
    state = AsyncData([
      for (final item in previous)
        if (item.id == notificationId) item.copyWith(isRead: true) else item,
    ]);

    final message = result['message'];
    return message is String && message.isNotEmpty
        ? message
        : (decision == 'accept'
            ? 'Görev kabul edildi.'
            : 'Görev reddedildi.');
  }

  Future<String> respondToDeletion({
    required String notificationId,
    required String decision,
  }) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) {
      throw NotificationException('Aktif çalışma alanı yok.');
    }

    final result =
        await ref.read(notificationRepositoryProvider).respondToDeletion(
              workspaceId: workspaceId,
              notificationId: notificationId,
              decision: decision,
            );

    final previous = state.valueOrNull ?? const <NotificationDto>[];
    state = AsyncData([
      for (final item in previous)
        if (item.id == notificationId) item.copyWith(isRead: true) else item,
    ]);

    final message = result['message'];
    return message is String && message.isNotEmpty
        ? message
        : (decision == 'accept'
            ? 'Görev silindi.'
            : 'Silme isteği reddedildi.');
  }
}

final notificationsProvider =
    AsyncNotifierProvider.autoDispose<NotificationsNotifier, List<NotificationDto>>(
  NotificationsNotifier.new,
);

final unreadNotificationCountProvider = Provider.autoDispose<int>((ref) {
  final async = ref.watch(notificationsProvider);
  return async.maybeWhen(
    data: (items) => items.where((n) => !n.isRead).length,
    orElse: () => 0,
  );
});
