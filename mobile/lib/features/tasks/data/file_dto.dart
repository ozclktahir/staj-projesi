/// Upload yanıtı — NestJS `url` döner (liste kaydında `file_url`).
class FileUploadResultDto {
  const FileUploadResultDto({
    required this.url,
    required this.fileName,
    this.fileType,
    this.path,
  });

  factory FileUploadResultDto.fromJson(Map<String, dynamic> json) {
    return FileUploadResultDto(
      url: json['url'] as String? ?? '',
      fileName: json['file_name'] as String? ?? '',
      fileType: json['file_type'] as String?,
      path: json['path'] as String?,
    );
  }

  final String url;
  final String fileName;
  final String? fileType;
  final String? path;
}

class TaskFileDto {
  const TaskFileDto({
    required this.id,
    required this.taskId,
    required this.fileName,
    required this.fileUrl,
    this.userId,
    this.fileType,
    this.createdAt,
  });

  factory TaskFileDto.fromJson(Map<String, dynamic> json) {
    return TaskFileDto(
      id: json['id'] as String,
      taskId: json['task_id'] as String? ?? '',
      userId: json['user_id'] as String?,
      fileName: json['file_name'] as String? ?? '',
      fileUrl: json['file_url'] as String? ?? '',
      fileType: json['file_type'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }

  final String id;
  final String taskId;
  final String? userId;
  final String fileName;
  final String fileUrl;
  final String? fileType;
  final String? createdAt;
}

class CreateFileDto {
  const CreateFileDto({
    required this.fileName,
    required this.fileUrl,
    this.fileType,
  });

  final String fileName;
  final String fileUrl;
  final String? fileType;

  Map<String, dynamic> toJson() {
    return {
      'file_name': fileName,
      'file_url': fileUrl,
      // Nest CreateFileDto file_type zorunlu (@IsNotEmpty).
      'file_type':
          (fileType != null && fileType!.trim().isNotEmpty)
              ? fileType!.trim()
              : 'application/octet-stream',
    };
  }
}
