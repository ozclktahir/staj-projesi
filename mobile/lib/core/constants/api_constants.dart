/// NestJS API sabitleri.
abstract final class ApiConstants {
  /// Derleme zamanı API adresi (`--dart-define=API_BASE_URL=...`).
  ///
  /// - Chrome / Windows / `adb reverse`: `http://localhost:3000`
  /// - Fiziksel telefon (Wi‑Fi): `http://<LAN_IP>:3000`
  /// - Android emülatör: `http://10.0.2.2:3000`
  ///
  /// Tanımsızsa localhost kullanılır (USB + `adb reverse tcp:3000 tcp:3000`).
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);

  static const String authLogin = '/auth/login';
  static const String authRegister = '/auth/register';
  static const String authRefresh = '/auth/refresh';
  static const String authLogout = '/auth/logout';
  static const String authMfaStatus = '/auth/mfa/status';
  static const String authMfaChallenge = '/auth/mfa/challenge';
  static const String authMfaVerify = '/auth/mfa/verify';
  static const String workspaces = '/workspace';

  static String workspaceLeave(String workspaceId) =>
      '/workspace/$workspaceId/leave';

  static String workspaceSearch(String workspaceId) =>
      '/workspace/$workspaceId/search';

  static String workspaceProjects(String workspaceId) =>
      '/workspaces/$workspaceId/projects';

  static String workspaceTasks(String workspaceId) =>
      '/workspaces/$workspaceId/tasks';

  static String workspaceTask(String workspaceId, String taskId) =>
      '/workspaces/$workspaceId/tasks/$taskId';

  static String taskComments(String workspaceId, String taskId) =>
      '/workspaces/$workspaceId/tasks/$taskId/comments';

  static String taskFiles(String workspaceId, String taskId) =>
      '/workspaces/$workspaceId/tasks/$taskId/files';

  static String taskFileUpload(String workspaceId, String taskId) =>
      '/workspaces/$workspaceId/tasks/$taskId/files/upload';

  static String taskFile(
    String workspaceId,
    String taskId,
    String fileId,
  ) =>
      '/workspaces/$workspaceId/tasks/$taskId/files/$fileId';

  static String workspaceNotes(String workspaceId) =>
      '/workspaces/$workspaceId/notes';

  static String workspaceNote(String workspaceId, String noteId) =>
      '/workspaces/$workspaceId/notes/$noteId';

  static String workspaceStatistics(String workspaceId) =>
      '/workspaces/$workspaceId/statistics';

  static String workspaceNotifications(String workspaceId) =>
      '/workspaces/$workspaceId/notifications';

  static String notificationRead(String workspaceId, String notificationId) =>
      '/workspaces/$workspaceId/notifications/$notificationId/read';

  static String notificationsReadAll(String workspaceId) =>
      '/workspaces/$workspaceId/notifications/read-all';

  static String notificationRespondClaim(
    String workspaceId,
    String notificationId,
  ) =>
      '/workspaces/$workspaceId/notifications/$notificationId/respond-claim';

  static String notificationRespondDeletion(
    String workspaceId,
    String notificationId,
  ) =>
      '/workspaces/$workspaceId/notifications/$notificationId/respond-deletion';

  /// Nest: `POST /workspace/:id/invite` (tekil `workspace`).
  static String workspaceInvite(String workspaceId) =>
      '/workspace/$workspaceId/invite';

  static const String invitationsMe = '/invitations/me';

  static String invitationAccept(String invitationId) =>
      '/invitations/$invitationId/accept';

  static String invitationReject(String invitationId) =>
      '/invitations/$invitationId/reject';

  static String workspaceActivityLogs(String workspaceId) =>
      '/workspaces/$workspaceId/activity-logs';

  static String workspaceById(String workspaceId) => '/workspace/$workspaceId';

  static String workspaceProject(String workspaceId, String projectId) =>
      '/workspaces/$workspaceId/projects/$projectId';

  static String workspaceMembers(String workspaceId) =>
      '/workspaces/$workspaceId/members';

  static String workspaceRejectedTasks(String workspaceId) =>
      '/workspaces/$workspaceId/tasks/rejected';

  static String workspaceDeletedTasks(String workspaceId) =>
      '/workspaces/$workspaceId/tasks/deleted';

  static String workspaceTaskRestore(String workspaceId, String taskId) =>
      '/workspaces/$workspaceId/tasks/$taskId/restore';

  static String workspaceTaskReassign(String workspaceId, String taskId) =>
      '/workspaces/$workspaceId/tasks/$taskId/reassign';

  static String workspaceAdminStats(String workspaceId) =>
      '/workspaces/$workspaceId/admin/stats';

  static String workspaceAdminRemoveUser(
    String workspaceId,
    String userId,
  ) =>
      '/workspaces/$workspaceId/admin/users/$userId/remove';

  static String workspaceAdminUpdateRole(
    String workspaceId,
    String userId,
  ) =>
      '/workspaces/$workspaceId/admin/users/$userId/role';

  static String workspaceProgressReports(String workspaceId) =>
      '/workspaces/$workspaceId/progress-reports';

  static String workspaceProgressReport(
    String workspaceId,
    String reportId,
  ) =>
      '/workspaces/$workspaceId/progress-reports/$reportId';

  static const String personalNotes = '/personal/notes';
  static String personalNote(String noteId) => '/personal/notes/$noteId';
  static const String personalTodos = '/personal/todos';
  static String personalTodo(String todoId) => '/personal/todos/$todoId';
  static const String personalFiles = '/personal/files';
  static const String personalFilesUpload = '/personal/files/upload';
  static String personalFile(String fileId) => '/personal/files/$fileId';
}
