/// Web `frontend/src/lib/rbac.ts` ile hizalı workspace rol yardımcıları.
String normalizeWorkspaceRole(String? role) {
  return (role ?? '').trim().toUpperCase();
}

/// OWNER veya ADMIN (DB: Admin / OWNER / ADMIN).
bool isAdminRole(String? role) {
  final r = normalizeWorkspaceRole(role);
  return r == 'ADMIN' || r == 'OWNER';
}

bool isOwnerRole(String? role) {
  return normalizeWorkspaceRole(role) == 'OWNER';
}

bool isMemberOrAbove(String? role) {
  final r = normalizeWorkspaceRole(role);
  return r == 'ADMIN' || r == 'OWNER' || r == 'MEMBER';
}

/// Aktif workspace + kullanıcı için UI yetki kapıları (web ile parity).
class WorkspaceCapabilities {
  const WorkspaceCapabilities({
    required this.role,
    required this.isOwner,
    required this.isAdmin,
    required this.canInvite,
    required this.canCreateProject,
    required this.canDeleteProject,
    required this.canDeleteWorkspace,
    required this.canCreateTask,
  });

  const WorkspaceCapabilities.none()
      : role = null,
        isOwner = false,
        isAdmin = false,
        canInvite = false,
        canCreateProject = false,
        canDeleteProject = false,
        canDeleteWorkspace = false,
        canCreateTask = false;

  factory WorkspaceCapabilities.resolve({
    required String? role,
    required String? ownerId,
    required String? userId,
  }) {
    final ownerById =
        ownerId != null && userId != null && ownerId == userId;
    final owner = isOwnerRole(role) || ownerById;
    final admin = owner || isAdminRole(role);
    final memberPlus = admin || isMemberOrAbove(role);

    return WorkspaceCapabilities(
      role: role,
      isOwner: owner,
      isAdmin: admin,
      canInvite: admin,
      canCreateProject: admin,
      canDeleteProject: admin,
      canDeleteWorkspace: owner,
      canCreateTask: memberPlus,
    );
  }

  final String? role;
  final bool isOwner;
  final bool isAdmin;
  final bool canInvite;
  final bool canCreateProject;
  final bool canDeleteProject;
  final bool canDeleteWorkspace;
  final bool canCreateTask;
}
