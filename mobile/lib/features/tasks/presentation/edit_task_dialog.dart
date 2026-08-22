import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../auth/providers/auth_provider.dart';
import '../../workspace/providers/workspace_capabilities_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../data/task_scope.dart';
import '../data/update_task_dto.dart';
import '../providers/task_assignees_provider.dart';
import '../providers/task_provider.dart';
import 'assignees_field.dart';

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
  final primaryAssigneeId = caps.isAdmin
      ? task.effectiveAssigneeId
      : (task.effectiveAssigneeId ?? userId);
  final workspaceId =
      ref.read(workspaceProvider).activeWorkspace?.id ?? task.workspaceId;
  final scope = (workspaceId == null || workspaceId.isEmpty)
      ? null
      : TaskScope(workspaceId: workspaceId, taskId: task.id);

  // Mevcut ek atananları (task_assignees) önceden getir; birincil ile
  // birleştirip sıralı tek bir seçim listesi olarak diyaloğa taşı — bkz.
  // AssigneesField.
  var extraAssigneeIds = <String>[];
  if (scope != null) {
    try {
      final current =
          await ref.read(taskAssigneesProvider(scope).future);
      extraAssigneeIds = [
        for (final assignee in current)
          if (assignee.id != primaryAssigneeId) assignee.id,
      ];
    } catch (_) {
      // Ek atananlar getirilemezse yalnızca birincil ile devam et.
      extraAssigneeIds = const [];
    }
  }

  var selectedAssigneeIds = <String>[
    if (primaryAssigneeId != null && primaryAssigneeId.isNotEmpty)
      primaryAssigneeId,
    ...extraAssigneeIds,
  ];
  DateTime? dueDate = task.dueDate != null
      ? DateTime.tryParse(task.dueDate!)?.toLocal()
      : null;

  if (!context.mounted) return null;

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
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: descriptionController,
                        enabled: !submitting,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Açıklama',
                        ),
                      ),
                      // Öncelik yalnızca görev OLUŞTURULURKEN belirlenir;
                      // görev detayından sonradan değiştirilemez (web ile
                      // aynı kural — bkz. task-detail-sheet.tsx).
                      const SizedBox(height: 16),
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
                      AssigneesField(
                        selectedIds: selectedAssigneeIds,
                        canMultiSelect: caps.isAdmin,
                        enabled: !submitting,
                        helperText: caps.isAdmin
                            ? 'Birincil atanana ek olarak bu görevi görebilecek üyeler.'
                            : null,
                        onChanged: (next) =>
                            setLocal(() => selectedAssigneeIds = next),
                      ),
                      if (errorText != null) ...[
                        const SizedBox(height: 16),
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
                OutlinedButton(
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
                            final primaryAssigneeId =
                                selectedAssigneeIds.isNotEmpty
                                    ? selectedAssigneeIds.first
                                    : null;
                            final resolvedAssignee = caps.isAdmin
                                ? primaryAssigneeId
                                : (primaryAssigneeId ?? userId);
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
                                    assigneeId: clearAssignee
                                        ? null
                                        : resolvedAssignee,
                                    clearAssignee: clearAssignee,
                                    dueDate: dueDate?.toUtc().toIso8601String(),
                                    clearDueDate: dueDate == null &&
                                        task.dueDate != null,
                                  ),
                                );

                            // Ek atananlar (task_assignees) — yalnızca
                            // admin/OWNER kaydedebilir (backend de aynı
                            // kuralı uygular). Birincil değişikliği zaten
                            // başarılı olduğundan, ek atama başarısız olsa
                            // bile diyaloğu kapatmayı engelleme.
                            if (caps.isAdmin && scope != null) {
                              final extras = selectedAssigneeIds.length > 1
                                  ? selectedAssigneeIds.sublist(1)
                                  : const <String>[];
                              try {
                                await ref
                                    .read(
                                      taskAssigneesProvider(scope).notifier,
                                    )
                                    .setAssignees(extras);
                              } catch (error) {
                                debugPrint(
                                  '[EditTask] setAssignees: $error',
                                );
                              }
                            }

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
