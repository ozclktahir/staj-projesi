import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../data/activity_log_dto.dart';
import '../data/activity_log_repository.dart';
import '../providers/activity_log_provider.dart';

/// Zaman tüneli formatında aktivite akışı.
class ActivityLogPanel extends ConsumerWidget {
  const ActivityLogPanel({
    super.key,
    this.projectId,
    this.padding = const EdgeInsets.fromLTRB(16, 8, 16, 88),
  });

  /// null ise tüm workspace aktiviteleri.
  final String? projectId;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(activityLogProvider(projectId));
    final formatter = DateFormat('dd.MM.yyyy HH:mm');

    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                error is ActivityLogException
                    ? error.message
                    : error.toString(),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () =>
                    ref.read(activityLogProvider(projectId).notifier).refresh(),
                child: const Text('Tekrar dene'),
              ),
            ],
          ),
        ),
      ),
      data: (logs) {
        if (logs.isEmpty) {
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(activityLogProvider(projectId).notifier).refresh(),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: padding,
              children: const [
                SizedBox(height: 80),
                Icon(Icons.history, size: 48),
                SizedBox(height: 16),
                Text(
                  'Henüz aktivite kaydı yok',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () =>
              ref.read(activityLogProvider(projectId).notifier).refresh(),
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: padding,
            itemCount: logs.length,
            separatorBuilder: (_, _) => const SizedBox(height: 4),
            itemBuilder: (context, index) {
              final log = logs[index];
              return _ActivityTimelineTile(
                log: log,
                timeLabel: _formatTime(formatter, log.createdAt),
                isFirst: index == 0,
                isLast: index == logs.length - 1,
              );
            },
          ),
        );
      },
    );
  }
}

class _ActivityTimelineTile extends StatelessWidget {
  const _ActivityTimelineTile({
    required this.log,
    required this.timeLabel,
    required this.isFirst,
    required this.isLast,
  });

  final ActivityLogDto log;
  final String timeLabel;
  final bool isFirst;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final icon = _iconFor(log.actionType);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 28,
            child: Column(
              children: [
                Expanded(
                  child: Container(
                    width: 2,
                    color: isFirst ? Colors.transparent : scheme.outlineVariant,
                  ),
                ),
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: scheme.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 14, color: scheme.onPrimaryContainer),
                ),
                Expanded(
                  child: Container(
                    width: 2,
                    color: isLast ? Colors.transparent : scheme.outlineVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    log.formattedMessage,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  if (timeLabel.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      timeLabel,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _iconFor(String action) {
    switch (action) {
      case 'task_created':
      case 'created':
        return Icons.add_task;
      case 'task_deleted':
      case 'deleted':
        return Icons.delete_outline;
      case 'status_changed':
        return Icons.flag_outlined;
      case 'priority_changed':
        return Icons.priority_high;
      case 'assignee_changed':
      case 'task_reassigned':
        return Icons.person_outline;
      case 'comment_added':
        return Icons.chat_bubble_outline;
      case 'attachment_added':
        return Icons.attach_file;
      case 'task_claim_accepted':
        return Icons.check_circle_outline;
      case 'task_claim_rejected':
        return Icons.cancel_outlined;
      default:
        return Icons.history;
    }
  }
}

String _formatTime(DateFormat formatter, String? raw) {
  if (raw == null || raw.isEmpty) return '';
  final parsed = DateTime.tryParse(raw)?.toLocal();
  if (parsed == null) return '';
  return formatter.format(parsed);
}
