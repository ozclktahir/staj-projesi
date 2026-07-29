class CommentAuthorDto {
  const CommentAuthorDto({
    this.id,
    this.email,
    this.fullName,
    this.firstName,
    this.lastName,
  });

  factory CommentAuthorDto.fromJson(Map<String, dynamic> json) {
    return CommentAuthorDto(
      id: json['id'] as String?,
      email: json['email'] as String?,
      fullName: json['full_name'] as String?,
      firstName: json['first_name'] as String?,
      lastName: json['last_name'] as String?,
    );
  }

  final String? id;
  final String? email;
  final String? fullName;
  final String? firstName;
  final String? lastName;

  String get displayName {
    if (fullName != null && fullName!.trim().isNotEmpty) return fullName!;
    final combined = [firstName, lastName]
        .whereType<String>()
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .join(' ');
    if (combined.isNotEmpty) return combined;
    if (email != null && email!.isNotEmpty) return email!;
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
    final authorRaw = json['author'];
    return CommentDto(
      id: json['id'] as String,
      taskId: json['task_id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      content: json['content'] as String? ?? '',
      createdAt: json['created_at'] as String?,
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
}

class CreateCommentDto {
  const CreateCommentDto({required this.content});

  final String content;

  Map<String, dynamic> toJson() => {'content': content.trim()};
}
