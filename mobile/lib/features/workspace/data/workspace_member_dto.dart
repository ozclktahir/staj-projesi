/// Workspace üye seçenekleri (web `WorkspaceMemberOption` parity).
class WorkspaceMemberDto {
  const WorkspaceMemberDto({
    required this.id,
    required this.displayName,
    this.email,
    this.role,
    this.fullName,
    this.avatarUrl,
  });

  factory WorkspaceMemberDto.fromJson(Map<String, dynamic> json) {
    final id = json['id'] as String? ?? '';
    final email = json['email'] as String?;
    final fullName = json['fullName'] as String? ?? json['full_name'] as String?;
    final display = json['displayName'] as String? ??
        json['display_name'] as String? ??
        fullName ??
        (email != null && email.contains('@') ? email.split('@').first : null) ??
        (id.length > 8 ? '${id.substring(0, 8)}…' : id);

    return WorkspaceMemberDto(
      id: id,
      displayName: display,
      email: email,
      role: json['role'] as String?,
      fullName: fullName,
      avatarUrl:
          json['avatarUrl'] as String? ?? json['avatar_url'] as String?,
    );
  }

  final String id;
  final String displayName;
  final String? email;
  final String? role;
  final String? fullName;
  final String? avatarUrl;

  String get label {
    final name = (fullName ?? displayName).trim();
    if (name.isNotEmpty) return name;
    final mail = email?.trim();
    if (mail != null && mail.isNotEmpty) return mail;
    return id.length > 8 ? '${id.substring(0, 8)}…' : id;
  }
}

class WorkspaceMembersResponse {
  const WorkspaceMembersResponse({
    required this.members,
    required this.isAdmin,
    required this.isOwner,
    this.role,
  });

  factory WorkspaceMembersResponse.fromJson(Map<String, dynamic> json) {
    final raw = json['members'];
    final members = raw is List
        ? raw
            .whereType<Map>()
            .map(
              (item) =>
                  WorkspaceMemberDto.fromJson(Map<String, dynamic>.from(item)),
            )
            .toList()
        : const <WorkspaceMemberDto>[];

    return WorkspaceMembersResponse(
      members: members,
      isAdmin: json['isAdmin'] as bool? ?? false,
      isOwner: json['isOwner'] as bool? ?? false,
      role: json['role'] as String?,
    );
  }

  final List<WorkspaceMemberDto> members;
  final bool isAdmin;
  final bool isOwner;
  final String? role;
}
