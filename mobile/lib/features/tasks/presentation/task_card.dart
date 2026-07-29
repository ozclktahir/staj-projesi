import 'package:flutter/material.dart';

import '../data/task_dto.dart';

class TaskCard extends StatelessWidget {
  const TaskCard({
    super.key,
    required this.task,
    required this.onTap,
  });

  final TaskDto task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: ListTile(
        onTap: onTap,
        title: Text(
          task.title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Row(
            children: [
              Icon(Icons.person_outline, size: 16, color: scheme.onSurfaceVariant),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  task.assigneeLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ),
        trailing: PriorityBadge(priority: task.priority),
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
        style: TextStyle(
          color: fg,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
