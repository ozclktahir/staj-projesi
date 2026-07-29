import 'package:flutter/foundation.dart';

import '../../tasks/data/task_dto.dart';
import '../data/workspace_statistics_dto.dart';

@immutable
class DashboardData {
  const DashboardData({
    required this.totalTasks,
    required this.completedTasks,
    required this.inProgressTasks,
    required this.todoTasks,
    required this.overdueTasks,
    required this.upcomingDeadlines,
  });

  factory DashboardData.empty() => const DashboardData(
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        overdueTasks: 0,
        upcomingDeadlines: [],
      );

  factory DashboardData.fromTasks(
    List<TaskDto> tasks, {
    WorkspaceStatisticsDto? remote,
  }) {
    final now = DateTime.now();
    var completed = 0;
    var inProgress = 0;
    var todo = 0;
    var overdue = 0;
    final withDue = <TaskDto>[];

    for (final task in tasks) {
      switch (task.status) {
        case TaskStatus.done:
          completed++;
        case TaskStatus.inProgress:
          inProgress++;
        case TaskStatus.todo:
          todo++;
      }

      final dueRaw = task.dueDate;
      if (dueRaw == null || dueRaw.isEmpty) continue;
      final due = DateTime.tryParse(dueRaw)?.toLocal();
      if (due == null) continue;

      if (task.status != TaskStatus.done && due.isBefore(now)) {
        overdue++;
      }
      if (task.status != TaskStatus.done) {
        withDue.add(task);
      }
    }

    withDue.sort((a, b) {
      final aDue = DateTime.tryParse(a.dueDate ?? '') ?? DateTime(2100);
      final bDue = DateTime.tryParse(b.dueDate ?? '') ?? DateTime(2100);
      return aDue.compareTo(bDue);
    });

    return DashboardData(
      totalTasks: remote?.totalTasks ?? tasks.length,
      completedTasks: remote?.completedTasks ?? completed,
      inProgressTasks: remote?.inProgressTasks ?? inProgress,
      todoTasks: remote?.todoTasks ?? todo,
      overdueTasks: remote?.overdueTasks ?? overdue,
      upcomingDeadlines: withDue.take(8).toList(),
    );
  }

  final int totalTasks;
  final int completedTasks;
  final int inProgressTasks;
  final int todoTasks;
  final int overdueTasks;
  final List<TaskDto> upcomingDeadlines;
}
