import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../workspace/providers/workspace_members_provider.dart';
import '../data/task_dto.dart';

class TaskCard extends ConsumerWidget {
  const TaskCard({
    super.key,
    required this.task,
    required this.onTap,
  });

  final TaskDto task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final labels = ref.watch(workspaceMemberLabelMapProvider);
    final claimPending = task.isClaimPending;
    final claimOverdue = task.isClaimOverdue;
    final assignee = task.assigneeDisplayName(labels);
    final desc = task.description?.trim();

    return Opacity(
      opacity: claimPending && !claimOverdue ? 0.6 : 1,
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        clipBehavior: Clip.antiAlias,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: BorderSide(
            color: claimOverdue
                ? Colors.red.shade400
                : scheme.outline.withValues(alpha: 0.85),
            width: claimOverdue
                ? 1.5
                : (scheme.brightness == Brightness.light ? 2 : 1),
          ),
        ),
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (claimPending || task.isDeletionPending)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        if (claimPending)
                          _StatusBadge(
                            label: claimOverdue
                                ? 'Kullanıcı görevi henüz kabul etmedi'
                                : 'Onay bekliyor',
                            bg: claimOverdue
                                ? Colors.red.shade100
                                : Colors.amber.shade100,
                            fg: claimOverdue
                                ? Colors.red.shade800
                                : Colors.amber.shade900,
                            border: claimOverdue
                                ? Colors.red.shade300
                                : Colors.amber.shade300,
                          ),
                        if (task.isDeletionPending)
                          _StatusBadge(
                            label: 'Silme onayı bekleniyor',
                            bg: Colors.orange.shade100,
                            fg: Colors.orange.shade900,
                            border: Colors.orange.shade300,
                          ),
                      ],
                    ),
                  ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            task.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          if (desc != null && desc.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              desc,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: scheme.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    _AssigneeChip(label: assignee),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    PriorityBadge(priority: task.priority),
                    const Spacer(),
                    Text(
                      task.status.label,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.label,
    required this.bg,
    required this.fg,
    required this.border,
  });

  final String label;
  final Color bg;
  final Color fg;
  final Color border;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: border),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}

class _AssigneeChip extends StatelessWidget {
  const _AssigneeChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final initial = label.isNotEmpty ? label.characters.first.toUpperCase() : '?';

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 120),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: 11,
            backgroundColor: scheme.surfaceContainerHighest,
            child: Text(
              initial,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: scheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class PriorityBadge extends StatelessWidget {
  const PriorityBadge({super.key, required this.priority});

  final TaskPriority priority;

  @override
  Widget build(BuildContext context) {
    // Web `priorityClass`: HIGH red, LOW emerald, default (MEDIUM/URGENT) amber.
    final (Color bg, Color fg, Color border) = switch (priority) {
      TaskPriority.high => (
          Colors.red.shade100,
          Colors.red.shade700,
          Colors.red.shade300,
        ),
      TaskPriority.low => (
          Colors.green.shade100,
          Colors.green.shade700,
          Colors.green.shade300,
        ),
      TaskPriority.medium || TaskPriority.urgent => (
          Colors.amber.shade100,
          Colors.amber.shade800,
          Colors.amber.shade300,
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: border),
      ),
      child: Text(
        priority.label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: fg,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
