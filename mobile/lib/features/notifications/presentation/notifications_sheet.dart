import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../data/notification_repository.dart';
import '../providers/notification_provider.dart';

Future<void> showNotificationsSheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => const _NotificationsSheetBody(),
  );
}

class _NotificationsSheetBody extends ConsumerWidget {
  const _NotificationsSheetBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    final height = MediaQuery.sizeOf(context).height * 0.7;
    final formatter = DateFormat('dd.MM.yyyy HH:mm');

    return SizedBox(
      height: height,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 8, 8),
            child: Row(
              children: [
                Text(
                  'Bildirimler',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Spacer(),
                TextButton(
                  onPressed: () async {
                    try {
                      await ref
                          .read(notificationsProvider.notifier)
                          .markAllAsRead();
                    } on NotificationException catch (error) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context)
                          ..hideCurrentSnackBar()
                          ..showSnackBar(
                            SnackBar(content: Text(error.message)),
                          );
                      }
                    } catch (_) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context)
                          ..hideCurrentSnackBar()
                          ..showSnackBar(
                            const SnackBar(
                              content: Text('Bildirimler güncellenemedi.'),
                            ),
                          );
                      }
                    }
                  },
                  child: const Text('Tümünü okundu'),
                ),
              ],
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(error.toString(), textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () =>
                            ref.read(notificationsProvider.notifier).refresh(),
                        child: const Text('Tekrar dene'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const Center(child: Text('Bildirim yok.'));
                }
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.read(notificationsProvider.notifier).refresh(),
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: items.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final item = items[index];
                      final time = item.createdAt != null
                          ? formatter.format(
                              DateTime.tryParse(item.createdAt!)?.toLocal() ??
                                  DateTime.now(),
                            )
                          : null;
                      return ListTile(
                        leading: Icon(
                          item.isRead
                              ? Icons.notifications_none
                              : Icons.notifications_active,
                          color: item.isRead
                              ? null
                              : Theme.of(context).colorScheme.primary,
                        ),
                        title: Text(
                          item.title,
                          style: TextStyle(
                            fontWeight:
                                item.isRead ? FontWeight.w400 : FontWeight.w700,
                          ),
                        ),
                        subtitle: Text(
                          [
                            if (item.message != null &&
                                item.message!.isNotEmpty)
                              item.message!,
                            ?time,
                          ].join('\n'),
                        ),
                        isThreeLine:
                            item.message != null && item.message!.isNotEmpty,
                        onTap: item.isRead
                            ? null
                            : () async {
                                try {
                                  await ref
                                      .read(notificationsProvider.notifier)
                                      .markAsRead(item.id);
                                } on NotificationException catch (error) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context)
                                      ..hideCurrentSnackBar()
                                      ..showSnackBar(
                                        SnackBar(content: Text(error.message)),
                                      );
                                  }
                                }
                              },
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
