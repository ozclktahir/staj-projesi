/// NestJS API sabitleri.
abstract final class ApiConstants {
  /// Android emülatör → host makinedeki NestJS (port 3000).
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);

  static const String authLogin = '/auth/login';
  static const String authRegister = '/auth/register';
  static const String authLogout = '/auth/logout';
  static const String workspaces = '/workspace';

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

  static String workspaceStatistics(String workspaceId) =>
      '/workspaces/$workspaceId/statistics';

  static String workspaceNotifications(String workspaceId) =>
      '/workspaces/$workspaceId/notifications';

  static String notificationRead(String workspaceId, String notificationId) =>
      '/workspaces/$workspaceId/notifications/$notificationId/read';

  static String notificationsReadAll(String workspaceId) =>
      '/workspaces/$workspaceId/notifications/read-all';
}
