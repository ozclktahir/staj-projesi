import 'task_dto.dart';

class CreateTaskDto {
  const CreateTaskDto({
    required this.title,
    this.description,
    this.status,
    this.priority,
    this.assigneeId,
    this.dueDate,
    this.projectId,
    this.parentTaskId,
  });

  final String title;
  final String? description;
  final TaskStatus? status;
  final TaskPriority? priority;
  final String? assigneeId;
  final String? dueDate;
  final String? projectId;
  final String? parentTaskId;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'title': title.trim(),
      // Nest CreateTaskDto ile hizalı — eksik alan validation hatası önlenir.
      'status': (status ?? TaskStatus.todo).apiValue,
      'priority': (priority ?? TaskPriority.medium).apiValue,
    };
    final desc = description?.trim();
    if (desc != null && desc.isNotEmpty) {
      map['description'] = desc;
    }
    final assignee = assigneeId?.trim();
    if (assignee != null && assignee.isNotEmpty) {
      map['assignee_id'] = assignee;
      map['assigned_to'] = assignee;
    }
    final due = dueDate?.trim();
    if (due != null && due.isNotEmpty) {
      map['due_date'] = due;
    }
    if (projectId != null && projectId!.trim().isNotEmpty) {
      map['project_id'] = projectId!.trim();
    }
    if (parentTaskId != null && parentTaskId!.trim().isNotEmpty) {
      map['parent_task_id'] = parentTaskId!.trim();
    }
    return map;
  }
}
