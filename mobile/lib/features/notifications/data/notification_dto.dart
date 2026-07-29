class NotificationDto {
  const NotificationDto({
    required this.id,
    required this.title,
    required this.isRead,
    this.userId,
    this.workspaceId,
    this.message,
    this.type,
    this.link,
    this.createdAt,
    this.metadata,
  });

  factory NotificationDto.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? metadata;
    final raw = json['metadata'] ?? json['payload'];
    if (raw is Map) {
      metadata = Map<String, dynamic>.from(raw);
    }

    return NotificationDto(
      id: json['id'] as String,
      userId: json['user_id'] as String?,
      workspaceId: json['workspace_id'] as String?,
      title: json['title'] as String? ?? '',
      message: json['message'] as String?,
      type: json['type'] as String?,
      isRead: json['is_read'] as bool? ?? false,
      link: json['link'] as String?,
      createdAt: json['created_at'] as String?,
      metadata: metadata,
    );
  }

  final String id;
  final String? userId;
  final String? workspaceId;
  final String title;
  final String? message;
  final String? type;
  final bool isRead;
  final String? link;
  final String? createdAt;
  final Map<String, dynamic>? metadata;

  bool get isInvitation {
    final t = (type ?? '').toLowerCase();
    return t.contains('invite') || t.contains('invitation') || t == 'davet';
  }

  String? get invitationId {
    final meta = metadata;
    if (meta == null) return null;
    final id = meta['invitation_id'] ?? meta['invite_id'] ?? meta['invitationId'];
    if (id is String && id.isNotEmpty) return id;
    return null;
  }

  NotificationDto copyWith({bool? isRead}) {
    return NotificationDto(
      id: id,
      userId: userId,
      workspaceId: workspaceId,
      title: title,
      message: message,
      type: type,
      isRead: isRead ?? this.isRead,
      link: link,
      createdAt: createdAt,
      metadata: metadata,
    );
  }
}
