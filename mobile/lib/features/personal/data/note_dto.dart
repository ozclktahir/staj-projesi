class NoteDto {
  const NoteDto({
    required this.id,
    required this.title,
    this.content,
    this.taskId,
    this.workspaceId,
    this.userId,
    this.createdAt,
    this.updatedAt,
  });

  factory NoteDto.fromJson(Map<String, dynamic> json) {
    return NoteDto(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      content: json['content'] is Map
          ? Map<String, dynamic>.from(json['content'] as Map)
          : null,
      taskId: json['task_id'] as String?,
      workspaceId: json['workspace_id'] as String?,
      userId: json['user_id'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  final String id;
  final String title;
  final Map<String, dynamic>? content;
  final String? taskId;
  final String? workspaceId;
  final String? userId;
  final String? createdAt;
  final String? updatedAt;

  String get plainText {
    final map = content;
    if (map == null) return '';
    final plain = map['plain'] ?? map['text'];
    if (plain is String) return plain;
    return '';
  }
}

class CreateNoteDto {
  const CreateNoteDto({
    required this.title,
    this.plainContent,
  });

  final String title;
  final String? plainContent;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'title': title.trim()};
    final text = plainContent?.trim();
    if (text != null && text.isNotEmpty) {
      map['content'] = {'plain': text};
    }
    return map;
  }
}
