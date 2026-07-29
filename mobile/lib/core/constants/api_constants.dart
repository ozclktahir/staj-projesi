/// NestJS API sabitleri (Adım 1 — yalnızca yapılandırma).
abstract final class ApiConstants {
  /// Android emülatör → host makinedeki NestJS (port 3000).
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Path sabitleri (çağrı Adım 2+; burada sadece referans)
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
}
