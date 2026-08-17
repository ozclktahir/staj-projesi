enum SearchHitType { project, task, member, note, todo, unknown }

/// Web `GlobalSearchHit` parity (bkz. `global-search.ts`).
class SearchHitDto {
  const SearchHitDto({
    required this.id,
    required this.type,
    required this.title,
    this.subtitle,
    this.projectId,
  });

  factory SearchHitDto.fromJson(Map<String, dynamic> json) {
    return SearchHitDto(
      id: json['id'] as String? ?? '',
      type: _typeFromString(json['type'] as String?),
      title: json['title'] as String? ?? '',
      subtitle: json['subtitle'] as String?,
      projectId: json['projectId'] as String?,
    );
  }

  final String id;
  final SearchHitType type;
  final String title;
  final String? subtitle;
  final String? projectId;

  static SearchHitType _typeFromString(String? value) {
    switch (value) {
      case 'project':
        return SearchHitType.project;
      case 'task':
        return SearchHitType.task;
      case 'member':
        return SearchHitType.member;
      case 'note':
        return SearchHitType.note;
      case 'todo':
        return SearchHitType.todo;
      default:
        return SearchHitType.unknown;
    }
  }
}
