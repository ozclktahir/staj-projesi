import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../workspace/providers/workspace_provider.dart';

/// İlk workspace oluşturma karşılama ekranı.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
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
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(
                      Icons.workspaces_outlined,
                      size: 64,
                      color: scheme.primary,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Hoş geldiniz!',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Başlamak için ilk çalışma alanınızı oluşturun.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(height: 28),
                    TextFormField(
                      controller: _nameController,
                      enabled: !submitting,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) {
                        if (!submitting) _submit();
                      },
                      decoration: const InputDecoration(
                        labelText: 'Çalışma alanı adı',
                        hintText: 'Örn: Ekip Projesi',
                        prefixIcon: Icon(Icons.apartment_outlined),
                        border: OutlineInputBorder(),
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
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.rocket_launch_outlined),
                      label: Text(
                        submitting ? 'Oluşturuluyor…' : 'Çalışma alanını oluştur',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
