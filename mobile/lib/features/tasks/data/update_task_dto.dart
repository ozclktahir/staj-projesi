import 'task_dto.dart';

class UpdateTaskDto {
  const UpdateTaskDto({
    this.title,
    this.description,
    this.status,
    this.priority,
    this.assigneeId,
    this.dueDate,
    this.projectId,
  });

  final String? title;
  final String? description;
  final TaskStatus? status;
  final TaskPriority? priority;
  final String? assigneeId;
  final String? dueDate;
  final String? projectId;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (title != null) {
      map['title'] = title!.trim();
    }
    if (description != null) {
      map['description'] = description;
    }
    if (status != null) {
      map['status'] = status!.apiValue;
    }
    if (priority != null) {
      map['priority'] = priority!.apiValue;
    }
    if (assigneeId != null) {
      map['assignee_id'] = assigneeId;
    }
    if (dueDate != null) {
      map['due_date'] = dueDate;
    }
    if (projectId != null) {
      map['project_id'] = projectId;
    }
    return map;
  }
}
