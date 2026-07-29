import 'package:flutter/foundation.dart';

/// Görev kapsamı (yorum / dosya provider family anahtarı).
@immutable
class TaskScope {
  const TaskScope({
    required this.workspaceId,
    required this.taskId,
  });

  final String workspaceId;
  final String taskId;

  @override
  bool operator ==(Object other) {
    return other is TaskScope &&
        other.workspaceId == workspaceId &&
        other.taskId == taskId;
  }

  @override
  int get hashCode => Object.hash(workspaceId, taskId);
}
