import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/tasks_repository.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  return TasksRepository();
});
