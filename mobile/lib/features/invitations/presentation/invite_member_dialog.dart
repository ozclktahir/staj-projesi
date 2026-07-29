import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/invitation_repository.dart';
import '../providers/invitation_provider.dart';

const _inviteRoles = ['Admin', 'Member', 'Guest'];

Future<bool?> showInviteMemberDialog(
  BuildContext context,
  WidgetRef ref, {
  required String workspaceId,
}) async {
  final formKey = GlobalKey<FormState>();
  final emailController = TextEditingController();

  try {
    return await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) {
        var submitting = false;
        var role = 'Member';
        String? errorText;

        return StatefulBuilder(
          builder: (context, setLocal) {
            final bottom = MediaQuery.viewInsetsOf(context).bottom;
            return Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, bottom + 20),
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Üye Davet Et',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'E-posta ve rol seçerek çalışma alanına davet gönderin.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      controller: emailController,
                      enabled: !submitting,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        labelText: 'E-posta',
                        hintText: 'ornek@email.com',
                        prefixIcon: Icon(Icons.mail_outline),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        final email = value?.trim() ?? '';
                        if (email.isEmpty) return 'E-posta zorunlu.';
                        if (!email.contains('@') || !email.contains('.')) {
                          return 'Geçerli bir e-posta girin.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      // ignore: deprecated_member_use
                      value: role,
                      decoration: const InputDecoration(
                        labelText: 'Rol',
                        prefixIcon: Icon(Icons.badge_outlined),
                        border: OutlineInputBorder(),
                      ),
                      items: [
                        for (final r in _inviteRoles)
                          DropdownMenuItem(value: r, child: Text(r)),
                      ],
                      onChanged: submitting
                          ? null
                          : (value) {
                              if (value != null) {
                                setLocal(() => role = value);
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
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: submitting
                                ? null
                                : () => Navigator.of(sheetContext).pop(false),
                            child: const Text('İptal'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: submitting
                                ? null
                                : () async {
                                    if (!(formKey.currentState?.validate() ??
                                        false)) {
                                      return;
                                    }
                                    setLocal(() {
                                      submitting = true;
                                      errorText = null;
                                    });
                                    try {
                                      await ref
                                          .read(myInvitationsProvider.notifier)
                                          .sendInvite(
                                            workspaceId: workspaceId,
                                            email: emailController.text,
                                            role: role,
                                          );
                                      if (!sheetContext.mounted) return;
                                      Navigator.of(sheetContext).pop(true);
                                    } on InvitationException catch (error) {
                                      setLocal(() {
                                        submitting = false;
                                        errorText = error.message;
                                      });
                                    } catch (_) {
                                      setLocal(() {
                                        submitting = false;
                                        errorText =
                                            'Davet gönderilemedi. Tekrar deneyin.';
                                      });
                                    }
                                  },
                            icon: submitting
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.send_outlined),
                            label: Text(submitting ? 'Gönderiliyor' : 'Davet Gönder'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  } finally {
    emailController.dispose();
  }
}
