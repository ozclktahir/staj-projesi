import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../providers/task_provider.dart';

Future<bool?> showCreateTaskDialog({
  required BuildContext context,
  required WidgetRef ref,
  required String projectId,
}) async {
  final formKey = GlobalKey<FormState>();
  final titleController = TextEditingController();
  final descriptionController = TextEditingController();
  var priority = TaskPriority.medium;
  var status = TaskStatus.todo;

  try {
    return await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        var submitting = false;
        String? errorText;

        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: const Text('Yeni görev'),
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
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Başlık',
                          border: OutlineInputBorder(),
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
                          labelText: 'Açıklama (opsiyonel)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<TaskPriority>(
                        initialValue: priority,
                        decoration: const InputDecoration(
                          labelText: 'Öncelik',
                          border: OutlineInputBorder(),
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
                      DropdownButtonFormField<TaskStatus>(
                        initialValue: status,
                        decoration: const InputDecoration(
                          labelText: 'Durum',
                          border: OutlineInputBorder(),
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
                          setLocal(() {
                            submitting = true;
                            errorText = null;
                          });
                          try {
                            final ok = await ref
                                .read(tasksProvider(projectId).notifier)
                                .createTask(
                                  title: titleController.text,
                                  description: descriptionController.text,
                                  status: status,
                                  priority: priority,
                                );
                            if (dialogContext.mounted) {
                              Navigator.of(dialogContext).pop(ok);
                            }
                          } on TaskException catch (error) {
                            setLocal(() {
                              submitting = false;
                              errorText = error.message;
                            });
                          } catch (_) {
                            setLocal(() {
                              submitting = false;
                              errorText = 'Görev oluşturulamadı.';
                            });
                          }
                        },
                  child: submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Oluştur'),
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
