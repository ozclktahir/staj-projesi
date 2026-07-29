import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/workspace_repository.dart';

final workspaceRepositoryProvider = Provider<WorkspaceRepository>((ref) {
  return WorkspaceRepository();
});
