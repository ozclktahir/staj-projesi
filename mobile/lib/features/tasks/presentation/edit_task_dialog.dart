import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../auth/providers/auth_provider.dart';
import '../../workspace/presentation/assignee_picker_field.dart';
import '../../workspace/providers/workspace_capabilities_provider.dart';
import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../data/update_task_dto.dart';
import '../providers/task_provider.dart';

Future<TaskDto?> showEditTaskDialog({
  required BuildContext context,
  required WidgetRef ref,
  required String projectId,
  required TaskDto task,
}) async {
  final formKey = GlobalKey<FormState>();
  final titleController = TextEditingController(text: task.title);
  final descriptionController =
      TextEditingController(text: task.description ?? '');
  final caps = ref.read(workspaceCapabilitiesProvider);
  final userId = ref.read(authProvider).userId;
  String? assigneeId = caps.isAdmin
      ? task.effectiveAssigneeId
      : (task.effectiveAssigneeId ?? userId);
  var priority = task.priority;
  DateTime? dueDate = task.dueDate != null
      ? DateTime.tryParse(task.dueDate!)?.toLocal()
      : null;

  try {
    return await showDialog<TaskDto>(
      context: context,
      builder: (dialogContext) {
        var submitting = false;
        String? errorText;

        return StatefulBuilder(
          builder: (context, setLocal) {
            final dateLabel = dueDate == null
                ? 'Teslim tarihi seç'
                : DateFormat('dd.MM.yyyy').format(dueDate!);

            return AlertDialog(
              title: const Text('Görevi düzenle'),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: titleController,
                        enabled: !submitting,
                        decoration: const InputDecoration(
                          labelText: 'Başlık',
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Başlık zorunlu.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: descriptionController,
                        enabled: !submitting,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Açıklama',
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<TaskPriority>(
                        initialValue: priority,
                        decoration: const InputDecoration(
                          labelText: 'Öncelik',
                        ),
                        items: [
                          for (final value in TaskPriority.values)
                            DropdownMenuItem(
                              value: value,
                              child: Text(value.label),
                            ),
                        ],
                        onChanged: submitting
                            ? null
                            : (value) {
                                if (value != null) {
                                  setLocal(() => priority = value);
                                }
                              },
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: submitting
                            ? null
                            : () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: dueDate ?? DateTime.now(),
                                  firstDate: DateTime(2020),
                                  lastDate: DateTime(2100),
                                );
                                if (picked != null) {
                                  setLocal(() => dueDate = picked);
                                }
                              },
                        icon: const Icon(Icons.event),
                        label: Text(dateLabel),
                      ),
                      if (dueDate != null)
                        TextButton(
                          onPressed: submitting
                              ? null
                              : () => setLocal(() => dueDate = null),
                          child: const Text('Teslim tarihini kaldır'),
                        ),
                      const SizedBox(height: 8),
                      AssigneePickerField(
                        value: assigneeId,
                        enabled: !submitting,
                        onChanged: (value) =>
                            setLocal(() => assigneeId = value),
                      ),
                      if (errorText != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          errorText!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: submitting
                      ? null
                      : () => Navigator.of(dialogContext).pop(),
                  child: const Text('İptal'),
                ),
                FilledButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          if (!(formKey.currentState?.validate() ?? false)) {
                            return;
                          }
                          setLocal(() {
                            submitting = true;
                            errorText = null;
                          });
                          try {
                            final resolvedAssignee = caps.isAdmin
                                ? assigneeId
                                : (assigneeId ?? userId);
                            final clearAssignee = caps.isAdmin &&
                                (resolvedAssignee == null ||
                                    resolvedAssignee.isEmpty) &&
                                (task.effectiveAssigneeId != null &&
                                    task.effectiveAssigneeId!.isNotEmpty);

                            final updated = await ref
                                .read(tasksProvider(projectId).notifier)
                                .updateTask(
                                  taskId: task.id,
                                  dto: UpdateTaskDto(
                                    title: titleController.text,
                                    description: descriptionController.text,
                                    priority: priority,
                                    assigneeId: clearAssignee
                                        ? null
                                        : resolvedAssignee,
                                    clearAssignee: clearAssignee,
                                    dueDate: dueDate?.toUtc().toIso8601String(),
                                    clearDueDate: dueDate == null &&
                                        task.dueDate != null,
                                  ),
                                );
                            if (dialogContext.mounted) {
                              Navigator.of(dialogContext).pop(updated);
                            }
                          } on TaskException catch (error) {
                            setLocal(() {
                              submitting = false;
                              errorText = error.message;
                            });
                          } catch (_) {
                            setLocal(() {
                              submitting = false;
                              errorText = 'Görev güncellenemedi.';
                            });
                          }
                        },
                  child: submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Kaydet'),
                ),
              ],
            );
          },
        );
      },
    );
  } finally {
    titleController.dispose();
    descriptionController.dispose();
  }
}
