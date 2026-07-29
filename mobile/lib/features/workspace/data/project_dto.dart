/// Proje API modelleri / DTO'ları.
class ProjectDto {
  const ProjectDto({
    required this.id,
    required this.name,
    required this.workspaceId,
    this.description,
    this.createdBy,
    this.createdAt,
    this.updatedAt,
  });

  factory ProjectDto.fromJson(Map<String, dynamic> json) {
    return ProjectDto(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      workspaceId: json['workspace_id'] as String? ?? '',
      description: json['description'] as String?,
      createdBy: json['created_by'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  final String id;
  final String name;
  final String workspaceId;
  final String? description;
  final String? createdBy;
  final String? createdAt;
  final String? updatedAt;
}

class CreateProjectDto {
  const CreateProjectDto({
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
