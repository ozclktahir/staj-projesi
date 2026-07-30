class PersonalNoteDto {
  const PersonalNoteDto({
    required this.id,
    required this.title,
    this.content = '',
    this.taskId,
    this.taskTitle,
    this.isCompleted = false,
    this.createdAt,
    this.updatedAt,
  });

  factory PersonalNoteDto.fromJson(Map<String, dynamic> json) {
    return PersonalNoteDto(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      taskId: json['taskId'] as String? ?? json['task_id'] as String?,
      taskTitle: json['taskTitle'] as String? ?? json['task_title'] as String?,
      isCompleted: json['isCompleted'] as bool? ??
          json['is_completed'] as bool? ??
          false,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
      updatedAt: json['updatedAt'] as String? ?? json['updated_at'] as String?,
    );
  }

  final String id;
  final String title;
  final String content;
  final String? taskId;
  final String? taskTitle;
  final bool isCompleted;
  final String? createdAt;
  final String? updatedAt;

  PersonalNoteDto copyWith({
    String? title,
    String? content,
    String? taskId,
    bool? isCompleted,
    bool clearTaskId = false,
  }) {
    return PersonalNoteDto(
      id: id,
      title: title ?? this.title,
      content: content ?? this.content,
      taskId: clearTaskId ? null : (taskId ?? this.taskId),
      taskTitle: taskTitle,
      isCompleted: isCompleted ?? this.isCompleted,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

class PersonalTodoDto {
  const PersonalTodoDto({
    required this.id,
    required this.task,
    this.dueDate,
    this.isCompleted = false,
    this.createdAt,
  });

  factory PersonalTodoDto.fromJson(Map<String, dynamic> json) {
    return PersonalTodoDto(
      id: json['id'] as String,
      task: json['task'] as String? ?? '',
      dueDate: json['dueDate'] as String? ?? json['due_date'] as String?,
      isCompleted: json['isCompleted'] as bool? ??
          json['is_completed'] as bool? ??
          false,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
    );
  }

  final String id;
  final String task;
  final String? dueDate;
  final bool isCompleted;
  final String? createdAt;
}

class PersonalFileDto {
  const PersonalFileDto({
    required this.id,
    required this.fileName,
    required this.fileUrl,
    this.storagePath,
    this.fileSize,
    this.createdAt,
  });

  factory PersonalFileDto.fromJson(Map<String, dynamic> json) {
    return PersonalFileDto(
      id: json['id'] as String,
      fileName: json['fileName'] as String? ??
          json['file_name'] as String? ??
          '',
      fileUrl:
          json['fileUrl'] as String? ?? json['file_url'] as String? ?? '',
      storagePath:
          json['storagePath'] as String? ?? json['storage_path'] as String?,
      fileSize: (json['fileSize'] as num?)?.toInt() ??
          (json['file_size'] as num?)?.toInt(),
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
    );
  }

  final String id;
  final String fileName;
  final String fileUrl;
  final String? storagePath;
  final int? fileSize;
  final String? createdAt;
}
