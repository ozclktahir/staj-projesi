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
  });

  final String title;
  final String? description;
  final TaskStatus? status;
  final TaskPriority? priority;
  final String? assigneeId;
  final String? dueDate;
  final String? projectId;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'title': title.trim(),
    };
    final desc = description?.trim();
    if (desc != null && desc.isNotEmpty) {
      map['description'] = desc;
    }
    if (status != null) {
      map['status'] = status!.apiValue;
    }
    if (priority != null) {
      map['priority'] = priority!.apiValue;
    }
    final assignee = assigneeId?.trim();
    if (assignee != null && assignee.isNotEmpty) {
      map['assignee_id'] = assignee;
    }
    final due = dueDate?.trim();
    if (due != null && due.isNotEmpty) {
      map['due_date'] = due;
    }
    if (projectId != null && projectId!.isNotEmpty) {
      map['project_id'] = projectId;
    }
    return map;
  }
}
