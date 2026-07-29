import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/project_repository.dart';
import '../providers/project_provider.dart';

Future<bool?> showCreateProjectDialog(BuildContext context, WidgetRef ref) async {
  final formKey = GlobalKey<FormState>();
  final nameController = TextEditingController();
  final descriptionController = TextEditingController();

  try {
    return await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        var submitting = false;
        String? errorText;

        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: const Text('Yeni proje'),
              content: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: nameController,
                      enabled: !submitting,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Proje adı',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Proje adı zorunlu.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: descriptionController,
                      enabled: !submitting,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Açıklama (opsiyonel)',
                        border: OutlineInputBorder(),
                      ),
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
                                .read(projectsProvider.notifier)
                                .createProject(
                                  name: nameController.text,
                                  description: descriptionController.text,
                                );
                            if (dialogContext.mounted) {
                              Navigator.of(dialogContext).pop(ok);
                            }
                          } on ProjectException catch (error) {
                            setLocal(() {
                              submitting = false;
                              errorText = error.message;
                            });
                          } catch (_) {
                            setLocal(() {
                              submitting = false;
                              errorText = 'Proje oluşturulamadı.';
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
    nameController.dispose();
    descriptionController.dispose();
  }
}
