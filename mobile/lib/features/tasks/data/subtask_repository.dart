import '../../../core/network/api_client.dart';
import 'create_task_dto.dart';
import 'task_dto.dart';
import 'task_repository.dart';
import 'update_task_dto.dart';

/// Alt görevler — Nest task uçları + `parent_task_id`.
class SubtaskRepository {
  SubtaskRepository({required ApiClient apiClient})
      : _tasks = TaskRepository(apiClient: apiClient);

  final TaskRepository _tasks;

  Future<List<TaskDto>> fetchSubtasks({
    required String workspaceId,
    required String parentTaskId,
  }) {
    return _tasks.fetchTasks(
      workspaceId: workspaceId,
      parentTaskId: parentTaskId,
      limit: 100,
    );
  }

  Future<TaskDto> createSubtask({
    required String workspaceId,
    required String parentTaskId,
    required String title,
    String? projectId,
  }) {
    return _tasks.createTask(
      workspaceId: workspaceId,
      dto: CreateTaskDto(
        title: title,
        parentTaskId: parentTaskId,
        projectId: projectId,
        status: TaskStatus.todo,
        priority: TaskPriority.medium,
      ),
    );
  }

  Future<TaskDto> setCompleted({
    required String workspaceId,
    required String subtaskId,
    required bool completed,
  }) {
    return _tasks.updateTask(
      workspaceId: workspaceId,
      taskId: subtaskId,
      dto: UpdateTaskDto(
        status: completed ? TaskStatus.done : TaskStatus.todo,
      ),
    );
  }
}
