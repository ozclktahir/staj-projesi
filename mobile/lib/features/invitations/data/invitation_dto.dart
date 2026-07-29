class InvitationDto {
  const InvitationDto({
    required this.id,
    required this.workspaceId,
    required this.email,
    required this.role,
    required this.status,
    this.invitedBy,
    this.createdAt,
    this.workspaceName,
  });

  factory InvitationDto.fromJson(Map<String, dynamic> json) {
    final workspace = json['workspaces'] ?? json['workspace'];
    String? workspaceName;
    if (workspace is Map) {
      workspaceName = workspace['name'] as String?;
    }

    return InvitationDto(
      id: json['id'] as String,
      workspaceId: json['workspace_id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'Member',
      status: json['status'] as String? ?? 'PENDING',
      invitedBy: json['invited_by'] as String?,
      createdAt: json['created_at'] as String?,
      workspaceName: workspaceName ?? json['workspace_name'] as String?,
    );
  }

  final String id;
  final String workspaceId;
  final String email;
  final String role;
  final String status;
  final String? invitedBy;
  final String? createdAt;
  final String? workspaceName;

  bool get isPending {
    final s = status.toUpperCase();
    return s == 'PENDING';
  }
}

class InviteMemberRequest {
  const InviteMemberRequest({
    required this.email,
    required this.role,
  });

  final String email;
  final String role;

  Map<String, dynamic> toJson() => {
        'email': email.trim(),
        'role': role,
      };
}
