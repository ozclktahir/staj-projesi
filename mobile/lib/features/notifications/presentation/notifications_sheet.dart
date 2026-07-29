import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../invitations/data/invitation_dto.dart';
import '../../invitations/data/invitation_repository.dart';
import '../../invitations/providers/invitation_provider.dart';
import '../data/notification_dto.dart';
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
    final notificationsAsync = ref.watch(notificationsProvider);
    final invitationsAsync = ref.watch(myInvitationsProvider);
    final height = MediaQuery.sizeOf(context).height * 0.75;
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
            child: RefreshIndicator(
              onRefresh: () async {
                await Future.wait([
                  ref.read(notificationsProvider.notifier).refresh(),
                  ref.read(myInvitationsProvider.notifier).refresh(),
                ]);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.only(bottom: 24),
                children: [
                  _PendingInvitationsSection(
                    async: invitationsAsync,
                    formatter: formatter,
                  ),
                  const Divider(height: 24),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Text(
                      'Workspace bildirimleri',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ),
                  notificationsAsync.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (error, _) => Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          Text(error.toString(), textAlign: TextAlign.center),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: () => ref
                                .read(notificationsProvider.notifier)
                                .refresh(),
                            child: const Text('Tekrar dene'),
                          ),
                        ],
                      ),
                    ),
                    data: (items) {
                      if (items.isEmpty) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Center(child: Text('Bildirim yok.')),
                        );
                      }
                      return Column(
                        children: [
                          for (var i = 0; i < items.length; i++) ...[
                            if (i > 0) const Divider(height: 1),
                            _NotificationTile(
                              item: items[i],
                              formatter: formatter,
                            ),
                          ],
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PendingInvitationsSection extends ConsumerWidget {
  const _PendingInvitationsSection({
    required this.async,
    required this.formatter,
  });

  final AsyncValue<List<InvitationDto>> async;
  final DateFormat formatter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return async.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: LinearProgressIndicator(),
      ),
      error: (error, _) => Padding(
        padding: const EdgeInsets.all(16),
        child: Text(
          'Davetler yüklenemedi: $error',
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
      ),
      data: (items) {
        final pending = items.where((i) => i.isPending).toList();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Text(
                'Bekleyen davetler${pending.isEmpty ? '' : ' (${pending.length})'}',
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ),
            if (pending.isEmpty)
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Text('Bekleyen davet yok.'),
              )
            else
              for (final invite in pending)
                _InvitationActionCard(
                  title: invite.workspaceName ?? 'Çalışma alanı daveti',
                  subtitle:
                      '${invite.role} rolü • ${invite.email}${invite.createdAt != null ? '\n${_formatTime(formatter, invite.createdAt)}' : ''}',
                  invitationId: invite.id,
                  notificationId: null,
                ),
          ],
        );
      },
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  const _NotificationTile({
    required this.item,
    required this.formatter,
  });

  final NotificationDto item;
  final DateFormat formatter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final time = item.createdAt != null
        ? _formatTime(formatter, item.createdAt)
        : null;
    final invitationId = item.invitationId;
    final showInviteActions = item.isInvitation && invitationId != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ListTile(
          leading: Icon(
            item.isInvitation
                ? Icons.mail_outline
                : item.isRead
                    ? Icons.notifications_none
                    : Icons.notifications_active,
            color: item.isRead
                ? null
                : Theme.of(context).colorScheme.primary,
          ),
          title: Text(
            item.title,
            style: TextStyle(
              fontWeight: item.isRead ? FontWeight.w400 : FontWeight.w700,
            ),
          ),
          subtitle: Text(
            [
              if (item.message != null && item.message!.isNotEmpty)
                item.message!,
              ?time,
            ].join('\n'),
          ),
          isThreeLine: item.message != null && item.message!.isNotEmpty,
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
        ),
        if (showInviteActions)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: _InviteActionButtons(
              invitationId: invitationId,
              notificationId: item.id,
            ),
          ),
      ],
    );
  }
}

class _InvitationActionCard extends StatelessWidget {
  const _InvitationActionCard({
    required this.title,
    required this.subtitle,
    required this.invitationId,
    required this.notificationId,
  });

  final String title;
  final String subtitle;
  final String invitationId;
  final String? notificationId;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            _InviteActionButtons(
              invitationId: invitationId,
              notificationId: notificationId,
            ),
          ],
        ),
      ),
    );
  }
}

class _InviteActionButtons extends ConsumerStatefulWidget {
  const _InviteActionButtons({
    required this.invitationId,
    required this.notificationId,
  });

  final String invitationId;
  final String? notificationId;

  @override
  ConsumerState<_InviteActionButtons> createState() =>
      _InviteActionButtonsState();
}

class _InviteActionButtonsState extends ConsumerState<_InviteActionButtons> {
  var _busy = false;

  Future<void> _run({
    required Future<void> Function() action,
    required String successMessage,
  }) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      if (widget.notificationId != null) {
        try {
          await ref
              .read(notificationsProvider.notifier)
              .markAsRead(widget.notificationId!);
        } catch (_) {
          // Davet işlemi başarılıysa bildirim okuma hatası kritik değil.
        }
        await ref.read(notificationsProvider.notifier).refresh();
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(successMessage)));
    } on InvitationException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(error.message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(content: Text('Davet işlemi başarısız oldu.')),
        );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _busy
                ? null
                : () => _run(
                      action: () => ref
                          .read(myInvitationsProvider.notifier)
                          .reject(widget.invitationId),
                      successMessage: 'Davet reddedildi.',
                    ),
            child: const Text('Reddet'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: FilledButton(
            onPressed: _busy
                ? null
                : () => _run(
                      action: () => ref
                          .read(myInvitationsProvider.notifier)
                          .accept(widget.invitationId),
                      successMessage: 'Davet kabul edildi.',
                    ),
            child: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Kabul Et'),
          ),
        ),
      ],
    );
  }
}

String _formatTime(DateFormat formatter, String? raw) {
  if (raw == null) return '';
  final parsed = DateTime.tryParse(raw)?.toLocal() ?? DateTime.now();
  return formatter.format(parsed);
}
