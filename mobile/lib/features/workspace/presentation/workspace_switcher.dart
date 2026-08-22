import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/workspace_dto.dart';
import '../providers/workspace_provider.dart';

Future<void> showWorkspaceSwitcher(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) {
      return Consumer(
        builder: (context, ref, _) {
          final state = ref.watch(workspaceProvider);
          final maxListHeight = MediaQuery.sizeOf(context).height * 0.45;

          return SafeArea(
            child: Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                bottom: MediaQuery.viewInsetsOf(context).bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Çalışma Alanı Seç',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  if (state.workspaces.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Text(
                        'Henüz çalışma alanınız yok. Yeni bir tane oluşturun.',
                        textAlign: TextAlign.center,
                      ),
                    )
                  else
                    ConstrainedBox(
                      constraints: BoxConstraints(maxHeight: maxListHeight),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: state.workspaces.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final workspace = state.workspaces[index];
                          final selected =
                              state.activeWorkspace?.id == workspace.id;
                          return ListTile(
                            leading: Icon(
                              selected
                                  ? Icons.check_circle
                                  : Icons.workspaces_outlined,
                              color: selected
                                  ? Theme.of(context).colorScheme.primary
                                  : null,
                            ),
                            title: Text(workspace.name),
                            subtitle: workspace.role != null
                                ? Text(workspace.role!)
                                : null,
                            selected: selected,
                            onTap: () async {
                              await ref
                                  .read(workspaceProvider.notifier)
                                  .selectWorkspace(workspace.id);
                              if (context.mounted) {
                                Navigator.of(context).pop();
                              }
                            },
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: state.isSubmitting
                        ? null
                        : () => showCreateWorkspaceDialog(context, ref),
                    icon: state.isSubmitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.add),
                    label: const Text('Yeni çalışma alanı'),
                  ),
                ],
              ),
            ),
          );
        },
      );
    },
  );
}

/// Yeni workspace oluşturma diyaloğu — hem burada (switcher) hem global
/// arama ekranındaki "Komutlar" bölümünden tetiklenebilir.
Future<void> showCreateWorkspaceDialog(
  BuildContext context,
  WidgetRef ref,
) async {
  final formKey = GlobalKey<FormState>();
  final nameController = TextEditingController();
  final descriptionController = TextEditingController();

  try {
    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        var submitting = false;
        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: const Text('Yeni çalışma alanı'),
              content: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextFormField(
                      controller: nameController,
                      enabled: !submitting,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Ad',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Çalışma alanı adı zorunlu.';
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
                          setLocal(() => submitting = true);
                          final ok = await ref
                              .read(workspaceProvider.notifier)
                              .createWorkspace(
                                name: nameController.text,
                                description: descriptionController.text,
                              );
                          if (!dialogContext.mounted) return;
                          if (ok) {
                            Navigator.of(dialogContext).pop(true);
                          } else {
                            setLocal(() => submitting = false);
                            final message =
                                ref.read(workspaceProvider).errorMessage ??
                                'Oluşturulamadı.';
                            ScaffoldMessenger.of(dialogContext)
                              ..hideCurrentSnackBar()
                              ..showSnackBar(SnackBar(content: Text(message)));
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

    if (created == true && context.mounted) {
      Navigator.of(context).pop();
    }
  } finally {
    nameController.dispose();
    descriptionController.dispose();
  }
}

/// AppBar başlığında aktif workspace adı.
String workspaceTitle(WorkspaceDto? workspace) {
  return workspace?.name ?? 'Çalışma alanı seç';
}
