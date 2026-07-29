class ActivityLogDto {
  const ActivityLogDto({
    required this.id,
    required this.actionType,
    this.workspaceId,
    this.projectId,
    this.taskId,
    this.userId,
    this.entityType,
    this.entityId,
    this.details,
    this.createdAt,
  });

  factory ActivityLogDto.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? details;
    final rawDetails = json['details'];
    if (rawDetails is Map) {
      details = Map<String, dynamic>.from(rawDetails);
    }

    final actionType = (json['action_type'] ??
            json['action'] ??
            details?['action_type'] ??
            '')
        .toString();

    return ActivityLogDto(
      id: json['id'] as String,
      workspaceId: json['workspace_id'] as String?,
      projectId: json['project_id'] as String? ??
          details?['project_id'] as String?,
      taskId: json['task_id'] as String? ?? details?['task_id'] as String?,
      userId: json['user_id'] as String?,
      entityType: json['entity_type'] as String?,
      entityId: json['entity_id'] as String?,
      actionType: actionType,
      details: details,
      createdAt: json['created_at'] as String?,
    );
  }

  final String id;
  final String? workspaceId;
  final String? projectId;
  final String? taskId;
  final String? userId;
  final String? entityType;
  final String? entityId;
  final String actionType;
  final Map<String, dynamic>? details;
  final String? createdAt;

  String get actorName {
    final d = details;
    if (d == null) return 'Bilinmeyen Kullanıcı';
    final name = d['actor_name'] ?? d['actorName'];
    if (name is String && name.trim().isNotEmpty) return name.trim();
    return 'Bilinmeyen Kullanıcı';
  }

  String get taskTitle {
    final d = details;
    if (d == null) return 'görev';
    final title = d['task_title'] ?? d['taskTitle'] ?? d['title'];
    if (title is String && title.trim().isNotEmpty) return title.trim();
    return 'görev';
  }

  /// İnsan okunur zaman tüneli mesajı.
  String get formattedMessage {
    final name = actorName;
    final title = taskTitle;
    final d = details ?? const <String, dynamic>{};

    switch (actionType) {
      case 'task_created':
      case 'created':
        return '$name "$title" görevini oluşturdu';
      case 'task_deleted':
      case 'deleted':
        return '$name "$title" görevini sildi';
      case 'status_changed':
        final to = d['new_value'] ?? d['to'] ?? d['status'];
        return '$name "$title" görevini "${to ?? 'yeni durum'}" olarak işaretledi';
      case 'priority_changed':
        final to = d['new_value'] ?? d['to'] ?? d['priority'];
        return '$name "$title" önceliğini "${to ?? 'yeni öncelik'}" yaptı';
      case 'assignee_changed':
        final assignee = d['new_assignee_name'] ?? d['assignee_name'];
        return '$name "$title" görevini ${assignee is String && assignee.isNotEmpty ? assignee : 'birine'} atadı';
      case 'comment_added':
        return '$name "$title" görevine yorum ekledi';
      case 'attachment_added':
        final fileName = d['file_name'];
        return '$name "$title" görevine ${fileName is String && fileName.isNotEmpty ? fileName : 'bir dosya'} ekledi';
      case 'task_updated':
      case 'updated':
        return '$name "$title" görevini güncelledi';
      case 'task_claim_accepted':
        return "$name, '$title' görevini kabul etti ve üzerinde çalışmaya başladı.";
      case 'task_claim_rejected':
        return "$name, kendisine atanan '$title' görevini reddetti.";
      case 'task_reassigned':
        final assignee = d['new_assignee_name'];
        return "$name, reddedilen '$title' görevini ${assignee is String && assignee.isNotEmpty ? assignee : 'bir kullanıcı'}'na yeniden atadı.";
      default:
        if (actionType.isNotEmpty) {
          return '$name bir işlem yaptı ($actionType)';
        }
        return '$name bir işlem yaptı';
    }
  }
}
