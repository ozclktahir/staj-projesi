import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/widgets/auth_split_shell.dart';
import '../../invitations/data/invitation_dto.dart';
import '../../invitations/data/invitation_repository.dart';
import '../../invitations/providers/invitation_provider.dart';
import '../../workspace/providers/workspace_provider.dart';

/// İlk giriş: bekleyen davet varsa önce onu göster (web'deki register→
/// davet-öncelikli onboarding parity — bkz. OnboardingGate/PROGRESS.md
/// "12 Ağustos 2026" madde 8). Hiç davet yoksa veya hepsi
/// kabul/reddedilince workspace oluşturma formuna düşer.
class OnboardingScreen extends ConsumerWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invitationsAsync = ref.watch(myInvitationsProvider);
    final pending = invitationsAsync.valueOrNull
            ?.where((invite) => invite.isPending)
            .toList() ??
        const <InvitationDto>[];

    if (invitationsAsync.isLoading && !invitationsAsync.hasValue) {
      return const AuthSplitShell(
        child: SizedBox(
          height: 120,
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    if (pending.isNotEmpty) {
      return AuthSplitShell(
        child: AuthFormCard(
          child: _PendingInvitesList(invitations: pending),
        ),
      );
    }

    return const AuthSplitShell(child: _CreateWorkspaceForm());
  }
}

class _PendingInvitesList extends ConsumerWidget {
  const _PendingInvitesList({required this.invitations});

  final List<InvitationDto> invitations;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'Bekleyen davetiniz var',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Bir çalışma alanına katılmak için daveti yanıtlayın, ya da kendi '
          'çalışma alanınızı oluşturmak için hepsini yanıtlayın.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFFA1A1AA),
              ),
        ),
        const SizedBox(height: 20),
        for (final invite in invitations) ...[
          _InviteCard(invitation: invite),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _InviteCard extends ConsumerStatefulWidget {
  const _InviteCard({required this.invitation});

  final InvitationDto invitation;

  @override
  ConsumerState<_InviteCard> createState() => _InviteCardState();
}

class _InviteCardState extends ConsumerState<_InviteCard> {
  var _busy = false;

  Future<void> _respond(bool accept) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final notifier = ref.read(myInvitationsProvider.notifier);
      if (accept) {
        await notifier.accept(widget.invitation.id);
      } else {
        await notifier.reject(widget.invitation.id);
      }
    } on InvitationException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Davet işlemi başarısız oldu.')),
          );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final invite = widget.invitation;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A1D),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF27272A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            invite.workspaceName ?? 'Çalışma alanı daveti',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            invite.role,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFFA1A1AA),
                ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _busy ? null : () => _respond(false),
                  child: const Text('Reddet'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _busy ? null : () => _respond(true),
                  child: _busy
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Kabul et'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CreateWorkspaceForm extends ConsumerStatefulWidget {
  const _CreateWorkspaceForm();

  @override
  ConsumerState<_CreateWorkspaceForm> createState() =>
      _CreateWorkspaceFormState();
}

class _CreateWorkspaceFormState extends ConsumerState<_CreateWorkspaceForm> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final ok = await ref.read(workspaceProvider.notifier).createWorkspace(
          name: _nameController.text.trim(),
        );

    if (!mounted) return;

    if (ok) {
      context.go(AppRoutes.home);
      return;
    }

    final message =
        ref.read(workspaceProvider).errorMessage ?? 'Oluşturulamadı.';
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final submitting = ref.watch(
      workspaceProvider.select((s) => s.isSubmitting),
    );

    return AuthFormCard(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Hoş geldiniz!',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Başlamak için ilk çalışma alanınızı oluşturun.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFFA1A1AA),
                  ),
            ),
            const SizedBox(height: 28),
            TextFormField(
              controller: _nameController,
              enabled: !submitting,
              textInputAction: TextInputAction.done,
              style: const TextStyle(color: Colors.white),
              onFieldSubmitted: (_) {
                if (!submitting) _submit();
              },
              decoration: const InputDecoration(
                labelText: 'Çalışma alanı adı',
                hintText: 'Örn: Ekip Projesi',
                prefixIcon: Icon(Icons.apartment_outlined),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Çalışma alanı adı zorunlu.';
                }
                if (value.trim().length < 2) {
                  return 'En az 2 karakter girin.';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: submitting ? null : _submit,
              icon: submitting
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Theme.of(context).colorScheme.onPrimary,
                      ),
                    )
                  : const Icon(Icons.rocket_launch_outlined),
              label: Text(
                submitting ? 'Oluşturuluyor…' : 'Çalışma alanını oluştur',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
