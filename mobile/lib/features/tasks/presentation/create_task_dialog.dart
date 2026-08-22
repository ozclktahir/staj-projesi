import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../auth/providers/auth_provider.dart';
import '../../workspace/providers/workspace_capabilities_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../providers/task_provider.dart';
import 'assignees_field.dart';

Future<bool?> showCreateTaskDialog({
  required BuildContext context,
  required WidgetRef ref,
  required String projectId,
}) async {
  final formKey = GlobalKey<FormState>();
  final titleController = TextEditingController();
  final descriptionController = TextEditingController();
  final caps = ref.read(workspaceCapabilitiesProvider);
  final userId = ref.read(authProvider).userId;
  final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
  // Sıralı seçim: ilk id birincil atanan (assignee_id), geri kalanı ek
  // atanan (task_assignees) — bkz. AssigneesField.
  var selectedAssigneeIds = <String>[
    if (!caps.isAdmin && userId != null && userId.isNotEmpty) userId,
  ];
  var priority = TaskPriority.medium;
  var status = TaskStatus.todo;
  DateTime? dueDate;
  String? rejectedTaskId;
  List<TaskDto> rejectedTasks = const [];
  var rejectedLoaded = false;

  if (caps.isAdmin && workspaceId != null) {
    try {
      rejectedTasks = await ref.read(taskRepositoryProvider).fetchRejectedTasks(
            workspaceId: workspaceId,
            projectId: projectId,
          );
      rejectedLoaded = true;
    } catch (_) {
      rejectedLoaded = true;
    }
  }

  if (!context.mounted) return null;

  try {
    return await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        var submitting = false;
        String? errorText;

        return StatefulBuilder(
          builder: (context, setLocal) {
            final isReassign = rejectedTaskId != null;
            final dateLabel = dueDate == null
                ? (isReassign ? 'Yeni bitiş tarihi' : 'Teslim tarihi')
                : DateFormat('dd.MM.yyyy').format(dueDate!);

            return AlertDialog(
              title: Text(isReassign ? 'Reddedileni yeniden ata' : 'Yeni görev'),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (caps.isAdmin && rejectedLoaded) ...[
                        if (rejectedTasks.isNotEmpty)
                          DropdownButtonFormField<String?>(
                            // ignore: deprecated_member_use
                            value: rejectedTaskId,
                            decoration: const InputDecoration(
                              labelText: 'Reddedilen görev (opsiyonel)',
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('Yeni görev oluştur'),
                              ),
                              for (final task in rejectedTasks)
                                DropdownMenuItem<String?>(
                                  value: task.id,
                                  child: Text(
                                    task.title,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                            ],
                            onChanged: submitting
                                ? null
                                : (value) {
                                    setLocal(() {
                                      rejectedTaskId = value;
                                      if (value != null) {
                                        TaskDto? selected;
                                        for (final task in rejectedTasks) {
                                          if (task.id == value) {
                                            selected = task;
                                            break;
                                          }
                                        }
                                        if (selected != null) {
                                          titleController.text = selected.title;
                                          descriptionController.text =
                                              selected.description ?? '';
                                          priority = selected.priority;
                                          dueDate = selected.dueDate != null
                                              ? DateTime.tryParse(
                                                    selected.dueDate!,
                                                  )?.toLocal()
                                              : null;
                                          selectedAssigneeIds = [];
                                        }
                                      }
                                    });
                                  },
                          ),
                        if (rejectedTasks.isNotEmpty)
                          const SizedBox(height: 16),
                      ],
                      TextFormField(
                        controller: titleController,
                        enabled: !submitting && !isReassign,
                        textInputAction: TextInputAction.next,
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
                      if (!isReassign)
                        TextFormField(
                          controller: descriptionController,
                          enabled: !submitting,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Açıklama',
                          ),
                        ),
                      if (!isReassign) const SizedBox(height: 16),
                      if (!isReassign)
                        DropdownButtonFormField<TaskPriority>(
                          // ignore: deprecated_member_use
                          value: priority,
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
                      if (!isReassign) const SizedBox(height: 16),
                      if (!isReassign)
                        DropdownButtonFormField<TaskStatus>(
                          // ignore: deprecated_member_use
                          value: status,
                          decoration: const InputDecoration(
                            labelText: 'Durum',
                          ),
                          items: [
                            for (final value in TaskStatus.values)
                              DropdownMenuItem(
                                value: value,
                                child: Text(value.label),
                              ),
                          ],
                          onChanged: submitting
                              ? null
                              : (value) {
                                  if (value != null) {
                                    setLocal(() => status = value);
                                  }
                                },
                        ),
                      if (!isReassign) const SizedBox(height: 16),
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
                      const SizedBox(height: 16),
                      // Çoklu atama artık görev OLUŞTURULURKEN de sorulur
                      // (web CreateTaskModal ile parite) — tek bileşen hem
                      // birincil hem ek atananları yönetir.
                      AssigneesField(
                        selectedIds: selectedAssigneeIds,
                        canMultiSelect: caps.isAdmin && !isReassign,
                        enabled: !submitting,
                        labelText:
                            isReassign ? 'Yeni atanan kişi' : 'Atananlar',
                        helperText: (!isReassign && caps.isAdmin)
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
                      : () => Navigator.of(dialogContext).pop(false),
                  child: const Text('İptal'),
                ),
                FilledButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          if (!(formKey.currentState?.validate() ?? false)) {
                            return;
                          }
                          if (isReassign && selectedAssigneeIds.isEmpty) {
                            setLocal(
                              () => errorText = 'Yeni atanan kişi seçin.',
                            );
                            return;
                          }
                          setLocal(() {
                            submitting = true;
                            errorText = null;
                          });
                          try {
                            if (isReassign) {
                              final wsId = ref
                                  .read(workspaceProvider)
                                  .activeWorkspace
                                  ?.id;
                              if (wsId == null) {
                                throw TaskException('Aktif çalışma alanı yok.');
                              }
                              await ref
                                  .read(taskRepositoryProvider)
                                  .reassignRejectedTask(
                                    workspaceId: wsId,
                                    taskId: rejectedTaskId!,
                                    assigneeId: selectedAssigneeIds.first,
                                    dueDate:
                                        dueDate?.toUtc().toIso8601String(),
                                  );
                              await ref
                                  .read(tasksProvider(projectId).notifier)
                                  .refresh();
                              if (dialogContext.mounted) {
                                Navigator.of(dialogContext).pop(true);
                              }
                              return;
                            }

                            final primaryAssigneeId =
                                selectedAssigneeIds.isNotEmpty
                                    ? selectedAssigneeIds.first
                                    : null;
                            final resolvedAssignee = caps.isAdmin
                                ? primaryAssigneeId
                                : (primaryAssigneeId ?? userId);
                            final extraAssigneeIds =
                                selectedAssigneeIds.length > 1
                                    ? selectedAssigneeIds.sublist(1)
                                    : const <String>[];
                            final trimmedTitle = titleController.text.trim();
                            if (trimmedTitle.isEmpty) {
                              setLocal(() {
                                submitting = false;
                                errorText = 'Başlık zorunludur.';
                              });
                              return;
                            }
                            debugPrint(
                              '[CreateTask] projectId=$projectId '
                              'assignee=$resolvedAssignee status=${status.apiValue} '
                              'priority=${priority.apiValue}',
                            );
                            final ok = await ref
                                .read(tasksProvider(projectId).notifier)
                                .createTask(
                                  title: trimmedTitle,
                                  description: descriptionController.text,
                                  status: status,
                                  priority: priority,
                                  assigneeId: resolvedAssignee,
                                  dueDate: dueDate
                                      ?.toUtc()
                                      .toIso8601String(),
                                  extraAssigneeIds: extraAssigneeIds,
                                );
                            if (dialogContext.mounted) {
                              Navigator.of(dialogContext).pop(ok);
                            }
                          } on TaskException catch (error) {
                            debugPrint('[CreateTask] TaskException: ${error.message}');
                            setLocal(() {
                              submitting = false;
                              errorText = error.message;
                            });
                          } catch (error, stack) {
                            debugPrint('[CreateTask] error: $error\n$stack');
                            setLocal(() {
                              submitting = false;
                              errorText = isReassign
                                  ? 'Yeniden atama başarısız.'
                                  : 'Görev oluşturulamadı: $error';
                            });
                          }
                        },
                  child: submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(isReassign ? 'Yeniden ata' : 'Oluştur'),
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
