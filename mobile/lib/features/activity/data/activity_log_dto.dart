import '../../../core/l10n/app_strings.dart';
import '../../../core/locale/locale_provider.dart';

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

  /// İnsan okunur zaman tüneli mesajı (varsayılan TR).
  String get formattedMessage => formatMessage();

  /// Locale-aware aktivite mesajı.
  String formatMessage([
    AppStrings? strings,
    Map<String, String>? memberNames,
  ]) {
    final s = strings ?? AppStrings.ofLocale(AppLocaleOption.tr);
    final name = () {
      final d = details;
      final fromDetails = d?['actor_name'] ?? d?['actorName'];
      if (fromDetails is String && fromDetails.trim().isNotEmpty) {
        return fromDetails.trim();
      }
      final id = userId;
      final fromMap = id == null ? null : memberNames?[id];
      if (fromMap != null && fromMap.trim().isNotEmpty) return fromMap.trim();
      return s.activityUnknownUser;
    }();
    final title = () {
      final d = details;
      if (d == null) return s.activityTaskFallback;
      final t = d['task_title'] ?? d['taskTitle'] ?? d['title'];
      if (t is String && t.trim().isNotEmpty) return t.trim();
      return s.activityTaskFallback;
    }();
    final d = details ?? const <String, dynamic>{};

    switch (actionType) {
      case 'task_created':
      case 'created':
        return s.activityCreated(name, title);
      case 'task_deleted':
      case 'deleted':
        return s.activityDeleted(name, title);
      case 'status_changed':
        final to = d['new_value'] ?? d['to'] ?? d['status'];
        return s.activityStatus(
          name,
          title,
          to?.toString() ?? (s.isEnglish ? 'new status' : 'yeni durum'),
        );
      case 'priority_changed':
        final to = d['new_value'] ?? d['to'] ?? d['priority'];
        return s.activityPriority(
          name,
          title,
          to?.toString() ?? (s.isEnglish ? 'new priority' : 'yeni öncelik'),
        );
      case 'assignee_changed':
        final assignee = d['new_assignee_name'] ?? d['assignee_name'];
        return s.activityAssignee(
          name,
          title,
          assignee is String && assignee.isNotEmpty
              ? assignee
              : (s.isEnglish ? 'someone' : 'birine'),
        );
      case 'comment_added':
        return s.activityComment(name, title);
      case 'attachment_added':
        final fileName = d['file_name'];
        return s.activityAttachment(
          name,
          title,
          fileName is String && fileName.isNotEmpty
              ? fileName
              : (s.isEnglish ? 'a file' : 'bir dosya'),
        );
      case 'task_updated':
      case 'updated':
        return s.activityUpdated(name, title);
      case 'task_claim_accepted':
        return s.activityClaimAccepted(name, title);
      case 'task_claim_rejected':
        return s.activityClaimRejected(name, title);
      case 'task_reassigned':
        final assignee = d['new_assignee_name'];
        return s.activityReassigned(
          name,
          title,
          assignee is String && assignee.isNotEmpty
              ? assignee
              : (s.isEnglish ? 'a user' : 'bir kullanıcı'),
        );
      default:
        return s.activityGeneric(
          name,
          actionType.isNotEmpty ? actionType : null,
        );
    }
  }
}
