/// NestJS görev durumu değerleri.
enum TaskStatus {
  todo('TODO'),
  inProgress('IN_PROGRESS'),
  done('DONE');

  const TaskStatus(this.apiValue);
  final String apiValue;

  static TaskStatus fromApi(String? value) {
    switch (value) {
      case 'IN_PROGRESS':
        return TaskStatus.inProgress;
      case 'DONE':
        return TaskStatus.done;
      case 'TODO':
      default:
        return TaskStatus.todo;
    }
  }

  String get label {
    switch (this) {
      case TaskStatus.todo:
        return 'Yapılacaklar';
      case TaskStatus.inProgress:
        return 'Devam Edenler';
      case TaskStatus.done:
        return 'Tamamlananlar';
    }
  }
}

/// NestJS görev önceliği değerleri.
enum TaskPriority {
  low('LOW'),
  medium('MEDIUM'),
  high('HIGH'),
  urgent('URGENT');

  const TaskPriority(this.apiValue);
  final String apiValue;

  static TaskPriority fromApi(String? value) {
    switch (value) {
      case 'LOW':
        return TaskPriority.low;
      case 'HIGH':
        return TaskPriority.high;
      case 'URGENT':
        return TaskPriority.urgent;
      case 'MEDIUM':
      default:
        return TaskPriority.medium;
    }
  }

  String get label {
    switch (this) {
      case TaskPriority.low:
        return 'Düşük';
      case TaskPriority.medium:
        return 'Orta';
      case TaskPriority.high:
        return 'Yüksek';
      case TaskPriority.urgent:
        return 'Acil';
    }
  }
}

/// Görev sahiplenme durumu (web assignment_status).
enum TaskAssignmentStatus {
  pending,
  accepted,
  rejected,
  unknown;

  static TaskAssignmentStatus fromApi(String? value) {
    switch ((value ?? '').trim().toLowerCase()) {
      case 'pending':
        return TaskAssignmentStatus.pending;
      case 'accepted':
        return TaskAssignmentStatus.accepted;
      case 'rejected':
        return TaskAssignmentStatus.rejected;
      default:
        return TaskAssignmentStatus.unknown;
    }
  }

  bool get isPending => this == TaskAssignmentStatus.pending;
  bool get isRejected => this == TaskAssignmentStatus.rejected;
}

/// Sahiplenme SLA (saat) — web CLAIM_SLA_HOURS.
const claimSlaHours = 24;

bool isAssignmentClaimOverdue({
  String? pendingAt,
  String? createdAt,
  int hours = claimSlaHours,
}) {
  final raw = pendingAt ?? createdAt;
  if (raw == null || raw.isEmpty) return false;
  final ms = DateTime.tryParse(raw)?.millisecondsSinceEpoch;
  if (ms == null) return false;
  return DateTime.now().millisecondsSinceEpoch - ms > hours * 60 * 60 * 1000;
}

class TaskDto {
  const TaskDto({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    this.description,
    this.assigneeId,
    this.assignedTo,
    this.dueDate,
    this.projectId,
    this.workspaceId,
    this.parentTaskId,
    this.createdBy,
    this.createdAt,
    this.updatedAt,
    this.assignmentStatus = TaskAssignmentStatus.unknown,
    this.assignmentPendingAt,
    this.deletionStatus,
  });

  factory TaskDto.fromJson(Map<String, dynamic> json) {
    return TaskDto(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      status: TaskStatus.fromApi(json['status'] as String?),
      priority: TaskPriority.fromApi(json['priority'] as String?),
      assigneeId: json['assignee_id'] as String?,
      assignedTo: json['assigned_to'] as String?,
      dueDate: json['due_date'] as String?,
      projectId: json['project_id'] as String?,
      workspaceId: json['workspace_id'] as String?,
      parentTaskId: json['parent_task_id'] as String?,
      createdBy: json['created_by'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
      assignmentStatus: TaskAssignmentStatus.fromApi(
        json['assignment_status'] as String?,
      ),
      assignmentPendingAt: json['assignment_pending_at'] as String?,
      deletionStatus: json['deletion_status'] as String?,
    );
  }

  final String id;
  final String title;
  final String? description;
  final TaskStatus status;
  final TaskPriority priority;
  final String? assigneeId;
  final String? assignedTo;
  final String? dueDate;
  final String? projectId;
  final String? workspaceId;
  final String? parentTaskId;
  final String? createdBy;
  final String? createdAt;
  final String? updatedAt;
  final TaskAssignmentStatus assignmentStatus;
  final String? assignmentPendingAt;
  final String? deletionStatus;

  String? get effectiveAssigneeId => assigneeId ?? assignedTo;

  bool get isDone => status == TaskStatus.done;

  bool get isClaimPending => assignmentStatus.isPending;

  bool get isClaimOverdue =>
      isClaimPending &&
      isAssignmentClaimOverdue(
        pendingAt: assignmentPendingAt,
        createdAt: createdAt,
      );

  bool get canChangeStatus => !isClaimPending;

  String get assigneeLabel {
    final id = effectiveAssigneeId;
    if (id == null || id.isEmpty) return 'Atanmadı';
    if (id.length <= 8) return id;
    return '${id.substring(0, 8)}…';
  }

  String assigneeDisplayName([Map<String, String>? labels]) {
    final id = effectiveAssigneeId;
    if (id == null || id.isEmpty) return 'Atanmadı';
    final fromMap = labels?[id];
    if (fromMap != null && fromMap.isNotEmpty) return fromMap;
    return assigneeLabel;
  }

  TaskDto copyWith({
    String? title,
    String? description,
    TaskStatus? status,
    TaskPriority? priority,
    String? assigneeId,
    String? assignedTo,
    String? dueDate,
    String? parentTaskId,
    TaskAssignmentStatus? assignmentStatus,
    String? assignmentPendingAt,
    String? deletionStatus,
    bool clearDescription = false,
    bool clearAssignee = false,
    bool clearDueDate = false,
    bool clearAssignmentPendingAt = false,
  }) {
    return TaskDto(
      id: id,
      title: title ?? this.title,
      description:
          clearDescription ? null : (description ?? this.description),
      status: status ?? this.status,
      priority: priority ?? this.priority,
      assigneeId: clearAssignee ? null : (assigneeId ?? this.assigneeId),
      assignedTo: clearAssignee ? null : (assignedTo ?? this.assignedTo),
      dueDate: clearDueDate ? null : (dueDate ?? this.dueDate),
      projectId: projectId,
      workspaceId: workspaceId,
      parentTaskId: parentTaskId ?? this.parentTaskId,
      createdBy: createdBy,
      createdAt: createdAt,
      updatedAt: updatedAt,
      assignmentStatus: assignmentStatus ?? this.assignmentStatus,
      assignmentPendingAt: clearAssignmentPendingAt
          ? null
          : (assignmentPendingAt ?? this.assignmentPendingAt),
      deletionStatus: deletionStatus ?? this.deletionStatus,
    );
  }
}
