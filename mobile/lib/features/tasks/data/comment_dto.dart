class CommentAuthorDto {
  const CommentAuthorDto({
    this.id,
    this.email,
    this.fullName,
    this.firstName,
    this.lastName,
  });

  factory CommentAuthorDto.fromJson(Map<String, dynamic> json) {
    String? asString(dynamic value) {
      if (value == null) return null;
      final text = value.toString().trim();
      return text.isEmpty ? null : text;
    }

    final fullName = asString(json['full_name']) ??
        asString(json['fullName']) ??
        asString(json['display_name']) ??
        asString(json['displayName']) ??
        asString(json['name']);

    return CommentAuthorDto(
      id: asString(json['id']),
      email: asString(json['email']),
      fullName: fullName,
      firstName: asString(json['first_name']) ?? asString(json['firstName']),
      lastName: asString(json['last_name']) ?? asString(json['lastName']),
    );
  }

  final String? id;
  final String? email;
  final String? fullName;
  final String? firstName;
  final String? lastName;

  String get displayName {
    if (fullName != null && fullName!.trim().isNotEmpty) {
      return fullName!.trim();
    }
    final combined = [firstName, lastName]
        .whereType<String>()
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .join(' ');
    if (combined.isNotEmpty) return combined;
    final mail = email?.trim();
    if (mail != null && mail.isNotEmpty) {
      final at = mail.indexOf('@');
      if (at > 0) return mail.substring(0, at);
      return mail;
    }
    return 'Kullanıcı';
  }
}

class CommentDto {
  const CommentDto({
    required this.id,
    required this.taskId,
    required this.userId,
    required this.content,
    this.createdAt,
    this.author,
  });

  factory CommentDto.fromJson(Map<String, dynamic> json) {
    final authorRaw = json['author'] ?? json['profile'] ?? json['user'];
    return CommentDto(
      id: json['id'] as String,
      taskId: json['task_id'] as String? ?? json['taskId'] as String? ?? '',
      userId: json['user_id'] as String? ?? json['userId'] as String? ?? '',
      content: json['content'] as String? ?? '',
      createdAt:
          json['created_at'] as String? ?? json['createdAt'] as String?,
      author: authorRaw is Map
          ? CommentAuthorDto.fromJson(Map<String, dynamic>.from(authorRaw))
          : null,
    );
  }

  final String id;
  final String taskId;
  final String userId;
  final String content;
  final String? createdAt;
  final CommentAuthorDto? author;

  String get authorLabel => author?.displayName ?? 'Kullanıcı';

  CommentDto copyWith({CommentAuthorDto? author}) {
    return CommentDto(
      id: id,
      taskId: taskId,
      userId: userId,
      content: content,
      createdAt: createdAt,
      author: author ?? this.author,
    );
  }
}

class CreateCommentDto {
  const CreateCommentDto({required this.content});

  final String content;

  Map<String, dynamic> toJson() => {'content': content.trim()};
}
