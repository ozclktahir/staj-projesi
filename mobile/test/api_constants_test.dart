import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/constants/api_constants.dart';

void main() {
  test('API path helpers', () {
    expect(ApiConstants.authRefresh, '/auth/refresh');
    expect(
      ApiConstants.workspaceDeletedTasks('w1'),
      '/workspaces/w1/tasks/deleted',
    );
    expect(
      ApiConstants.workspaceTaskRestore('w1', 't1'),
      '/workspaces/w1/tasks/t1/restore',
    );
    expect(
      ApiConstants.workspaceAdminStats('w1'),
      '/workspaces/w1/admin/stats',
    );
    expect(
      ApiConstants.workspaceProgressReports('w1'),
      '/workspaces/w1/progress-reports',
    );
  });
}
