/// NestJS `GET /workspaces/:id/statistics` yanıtı (RPC alan adları esnek).
class WorkspaceStatisticsDto {
  const WorkspaceStatisticsDto({
    this.totalTasks,
    this.completedTasks,
    this.overdueTasks,
    this.inProgressTasks,
    this.todoTasks,
  });

  factory WorkspaceStatisticsDto.fromJson(dynamic raw) {
    Map<String, dynamic>? map;
    if (raw is Map) {
      map = Map<String, dynamic>.from(raw);
    } else if (raw is List && raw.isNotEmpty && raw.first is Map) {
      map = Map<String, dynamic>.from(raw.first as Map);
    }
    if (map == null) return const WorkspaceStatisticsDto();

    return WorkspaceStatisticsDto(
      totalTasks: _readInt(map, const [
        'total_tasks',
        'totalTasks',
        'total',
        'task_count',
      ]),
      completedTasks: _readInt(map, const [
        'completed_tasks',
        'completedTasks',
        'completed',
        'done',
        'done_count',
      ]),
      overdueTasks: _readInt(map, const [
        'overdue_tasks',
        'overdueTasks',
        'overdue',
        'delayed',
        'late_tasks',
      ]),
      inProgressTasks: _readInt(map, const [
        'in_progress_tasks',
        'inProgressTasks',
        'in_progress',
        'inProgress',
      ]),
      todoTasks: _readInt(map, const [
        'todo_tasks',
        'todoTasks',
        'todo',
        'pending',
      ]),
    );
  }

  final int? totalTasks;
  final int? completedTasks;
  final int? overdueTasks;
  final int? inProgressTasks;
  final int? todoTasks;

  static int? _readInt(Map<String, dynamic> map, List<String> keys) {
    for (final key in keys) {
      final value = map[key];
      if (value is int) return value;
      if (value is num) return value.toInt();
      if (value is String) {
        final parsed = int.tryParse(value);
        if (parsed != null) return parsed;
      }
    }
    return null;
  }
}
