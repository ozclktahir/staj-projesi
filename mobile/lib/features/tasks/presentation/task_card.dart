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

    return Opacity(
      opacity: claimPending && !claimOverdue ? 0.65 : 1,
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: BorderSide(
            color: claimOverdue
                ? Colors.red.shade400
                : scheme.outline.withValues(alpha: 0.6),
            width: claimOverdue ? 1.5 : 1,
          ),
        ),
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (claimPending) ...[
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: claimOverdue
                            ? Colors.red.shade100
                            : Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: claimOverdue
                              ? Colors.red.shade300
                              : Colors.amber.shade300,
                        ),
                      ),
                      child: Text(
                        claimOverdue
                            ? 'Kullanıcı henüz görevi kabul etmedi! (SLA)'
                            : 'Onay bekliyor',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: claimOverdue
                              ? Colors.red.shade800
                              : Colors.amber.shade900,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                if (task.isDeletionPending) ...[
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade100,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.orange.shade300),
                      ),
                      child: Text(
                        'Silme onayı bekleniyor',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Colors.orange.shade900,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            task.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(
                                Icons.person_outline,
                                size: 16,
                                color: scheme.onSurfaceVariant,
                              ),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  task.assigneeDisplayName(labels),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    PriorityBadge(priority: task.priority),
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

class PriorityBadge extends StatelessWidget {
  const PriorityBadge({super.key, required this.priority});

  final TaskPriority priority;

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg) = switch (priority) {
      TaskPriority.urgent => (Colors.purple.shade100, Colors.purple.shade900),
      TaskPriority.high => (Colors.red.shade100, Colors.red.shade800),
      TaskPriority.medium => (Colors.orange.shade100, Colors.orange.shade800),
      TaskPriority.low => (Colors.green.shade100, Colors.green.shade800),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        priority.label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: fg,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
