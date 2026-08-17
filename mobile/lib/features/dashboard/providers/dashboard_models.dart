import 'package:flutter/foundation.dart';

import '../../tasks/data/task_dto.dart';
import '../data/workspace_statistics_dto.dart';

@immutable
class DashboardChartSlice {
  const DashboardChartSlice({
    required this.key,
    required this.label,
    required this.count,
  });

  final String key;
  final String label;
  final int count;
}

@immutable
class DashboardWorkloadItem {
  const DashboardWorkloadItem({
    required this.userId,
    required this.name,
    required this.total,
    required this.completed,
  });

  final String userId;
  final String name;
  final int total;
  final int completed;
}

@immutable
class DashboardData {
  const DashboardData({
    required this.totalTasks,
    required this.completedTasks,
    required this.inProgressTasks,
    required this.todoTasks,
    required this.overdueTasks,
    required this.completionRate,
    required this.activeMembers,
    required this.byPriority,
    required this.workload,
    required this.upcomingDeadlines,
  });

  factory DashboardData.empty() => const DashboardData(
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
        activeMembers: 0,
        byPriority: [
          DashboardChartSlice(key: 'HIGH', label: 'Yüksek', count: 0),
          DashboardChartSlice(key: 'MEDIUM', label: 'Orta', count: 0),
          DashboardChartSlice(key: 'LOW', label: 'Düşük', count: 0),
        ],
        workload: [],
        upcomingDeadlines: [],
      );

  factory DashboardData.fromTasks(
    List<TaskDto> tasks, {
    WorkspaceStatisticsDto? remote,
    Map<String, String> memberLabels = const {},
    int? memberCount,
    // Web'deki useWorkspacePresence ile aynı sözleşme: null/hazır değilken
    // statik üye sayısına düşülür, hazır olunca gerçek zamanlı sayı kullanılır.
    int? onlineCount,
  }) {
    // Sayaçlara yalnızca GERÇEKTEN aktif görevler girer: sahiplenme onayı
    // bekleyen (pending) veya reddedilmiş (rejected) görevler "toplam görev"
    // gibi KPI'lara sayılmaz — web'deki isCountableTask ile aynı kural
    // (bkz. frontend/src/app/actions/analytics.ts).
    final topLevel = [
      for (final task in tasks)
        if ((task.parentTaskId == null || task.parentTaskId!.isEmpty) &&
            !task.assignmentStatus.isPending &&
            !task.assignmentStatus.isRejected)
          task,
    ];

    final now = DateTime.now();
    var completed = 0;
    var inProgress = 0;
    var todo = 0;
    var overdue = 0;
    var high = 0;
    var medium = 0;
    var low = 0;
    final withDue = <TaskDto>[];
    final workloadMap = <String, ({int total, int completed})>{};

    for (final task in topLevel) {
      switch (task.status) {
        case TaskStatus.done:
          completed++;
        case TaskStatus.inProgress:
          inProgress++;
        case TaskStatus.todo:
          todo++;
      }

      // Web normalizePriority: HIGH / LOW özel; URGENT dahil diğerleri MEDIUM.
      switch (task.priority) {
        case TaskPriority.high:
          high++;
        case TaskPriority.low:
          low++;
        case TaskPriority.medium:
        case TaskPriority.urgent:
          medium++;
      }

      final assignee = task.effectiveAssigneeId;
      if (assignee != null && assignee.isNotEmpty) {
        final prev = workloadMap[assignee] ?? (total: 0, completed: 0);
        workloadMap[assignee] = (
          total: prev.total + 1,
          completed: prev.completed + (task.isDone ? 1 : 0),
        );
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

    final workload = workloadMap.entries
        .map((e) {
          final label = memberLabels[e.key];
          final name = (label != null && label.isNotEmpty)
              ? label
              : (e.key.length > 8 ? '${e.key.substring(0, 8)}…' : e.key);
          return DashboardWorkloadItem(
            userId: e.key,
            name: name,
            total: e.value.total,
            completed: e.value.completed,
          );
        })
        .toList()
      ..sort((a, b) => b.total.compareTo(a.total));

    // Sayaçlar için ÖNCE yerel hesap kullanılır: `remote` (get_workspace_statistics
    // RPC'si) assignment_status'ü bilmediği için onay bekleyen görevleri de
    // sayıyordu. Görev listesi hiç çekilemediyse (403/ağ hatası) RPC'ye düşülür.
    final hasLocalTasks = tasks.isNotEmpty;
    final total = hasLocalTasks ? topLevel.length : (remote?.totalTasks ?? 0);
    final completedFinal =
        hasLocalTasks ? completed : (remote?.completedTasks ?? 0);
    final completionRate =
        total == 0 ? 0.0 : ((completedFinal / total) * 1000).round() / 10;

    final members = memberCount ?? memberLabels.length;
    final activeMembers = onlineCount ?? members;

    return DashboardData(
      totalTasks: total,
      completedTasks: completedFinal,
      inProgressTasks:
          hasLocalTasks ? inProgress : (remote?.inProgressTasks ?? 0),
      todoTasks: hasLocalTasks ? todo : (remote?.todoTasks ?? 0),
      overdueTasks: hasLocalTasks ? overdue : (remote?.overdueTasks ?? 0),
      completionRate: completionRate,
      activeMembers: activeMembers,
      byPriority: [
        DashboardChartSlice(key: 'HIGH', label: 'Yüksek', count: high),
        DashboardChartSlice(key: 'MEDIUM', label: 'Orta', count: medium),
        DashboardChartSlice(key: 'LOW', label: 'Düşük', count: low),
      ],
      workload: workload,
      upcomingDeadlines: withDue.take(8).toList(),
    );
  }

  final int totalTasks;
  final int completedTasks;
  final int inProgressTasks;
  final int todoTasks;
  final int overdueTasks;
  final double completionRate;
  final int activeMembers;
  final List<DashboardChartSlice> byPriority;
  final List<DashboardWorkloadItem> workload;
  final List<TaskDto> upcomingDeadlines;
}
