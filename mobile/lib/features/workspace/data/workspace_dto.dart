/// Workspace API modelleri / DTO'ları.
class WorkspaceDto {
  const WorkspaceDto({
    required this.id,
    required this.name,
    this.description,
    this.ownerId,
    this.role,
    this.createdAt,
    this.updatedAt,
  });

  factory WorkspaceDto.fromJson(Map<String, dynamic> json) {
    return WorkspaceDto(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      ownerId: json['owner_id'] as String?,
      role: json['role'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  final String id;
  final String name;
  final String? description;
  final String? ownerId;
  final String? role;
  final String? createdAt;
  final String? updatedAt;
}

class CreateWorkspaceDto {
  const CreateWorkspaceDto({
    required this.name,
    this.description,
  });

  final String name;
  final String? description;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'name': name.trim()};
    final desc = description?.trim();
    if (desc != null && desc.isNotEmpty) {
      map['description'] = desc;
    }
    return map;
  }
}
