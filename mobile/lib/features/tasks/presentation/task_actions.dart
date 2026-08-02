import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../personal/providers/personal_tasks_provider.dart';
import '../../workspace/providers/workspace_capabilities_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../data/update_task_dto.dart';
import '../providers/task_provider.dart';

/// Durum seçimi — bottom sheet.
Future<TaskStatus?> showTaskStatusPicker({
  required BuildContext context,
  required TaskStatus current,
}) {
  return showModalBottomSheet<TaskStatus>(
    context: context,
    showDragHandle: true,
    builder: (sheetContext) {
      return SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text(
                'Durum seç',
                style: Theme.of(sheetContext).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
            for (final value in TaskStatus.values)
              ListTile(
                leading: Icon(
                  current == value
                      ? Icons.radio_button_checked
                      : Icons.radio_button_unchecked,
                ),
                title: Text(value.label),
                selected: current == value,
                onTap: () => Navigator.of(sheetContext).pop(value),
              ),
            const SizedBox(height: 8),
          ],
        ),
      );
    },
  );
}

/// Dual-approval silme onayı diyaloğu + API çağrısı.
///
/// Döner: snackbar mesajı; `null` = iptal.
Future<String?> confirmAndRequestTaskDeletion({
  required BuildContext context,
  required WidgetRef ref,
  required TaskDto task,
  required String projectId,
}) async {
  if (task.isDeletionPending) {
    return 'Bu görev için zaten silme onayı bekleniyor.';
  }

  final isAdmin = ref.read(workspaceCapabilitiesProvider).isAdmin;
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Silme onayı iste'),
      content: Text(
        isAdmin
            ? 'Görev doğrudan silinmez. Atanan kullanıcıya “Görev tamamlandı mı, sileyim mi?” bildirimi gönderilir.'
            : 'Görev doğrudan silinmez. Yöneticiye “Görevi silmek istiyorum” bildirimi gönderilir.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(false),
          child: const Text('İptal'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(dialogContext).pop(true),
          child: const Text('Onay iste'),
        ),
      ],
    ),
  );
  if (confirmed != true) return null;

  final workspaceId =
      ref.read(workspaceProvider).activeWorkspace?.id ?? task.workspaceId;
  if (workspaceId == null || workspaceId.isEmpty) {
    throw TaskException('Workspace seçilmedi.');
  }

  if (projectId.isNotEmpty) {
    return ref.read(tasksProvider(projectId).notifier).deleteTask(task.id);
  }

  final result = await ref.read(taskRepositoryProvider).deleteTask(
        workspaceId: workspaceId,
        taskId: task.id,
      );
  ref.invalidate(personalTasksProvider);
  return result['message'] as String? ?? 'Silme onayı isteği gönderildi.';
}

/// Optimistic durum güncellemesi (PATCH).
Future<void> applyTaskStatusChange({
  required WidgetRef ref,
  required TaskDto task,
  required String projectId,
  required TaskStatus status,
}) async {
  if (status == task.status) return;
  if (!task.canChangeStatus) {
    throw TaskException(
      'Sahiplenme onayı bekleyen görevin durumu değiştirilemez.',
    );
  }

  final workspaceId =
      ref.read(workspaceProvider).activeWorkspace?.id ?? task.workspaceId;
  if (workspaceId == null || workspaceId.isEmpty) {
    throw TaskException('Workspace seçilmedi.');
  }

  if (projectId.isNotEmpty) {
    await ref.read(tasksProvider(projectId).notifier).updateStatus(
          task.id,
          status,
        );
  } else {
    await ref.read(taskRepositoryProvider).updateTask(
          workspaceId: workspaceId,
          taskId: task.id,
          dto: UpdateTaskDto(status: status),
        );
    ref.invalidate(personalTasksProvider);
  }
}
