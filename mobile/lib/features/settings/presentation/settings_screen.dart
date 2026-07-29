import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/locale/locale_provider.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/theme_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../workspace/providers/workspace_provider.dart';

/// Tema, dil ve (OWNER ise) workspace silme.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _confirmDeleteWorkspace(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final active = ref.read(workspaceProvider).activeWorkspace;
    if (active == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Çalışma alanını sil'),
        content: Text(
          '"${active.name}" kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('İptal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Sil'),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    final ok =
        await ref.read(workspaceProvider.notifier).deleteWorkspace(active.id);
    if (!context.mounted) return;

    if (ok) {
      final remaining = ref.read(workspaceProvider).workspaces;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(content: Text('Çalışma alanı silindi.')),
        );
      if (remaining.isEmpty) {
        context.go(AppRoutes.onboarding);
      } else {
        context.go(AppRoutes.home);
      }
    } else {
      final message =
          ref.read(workspaceProvider).errorMessage ?? 'Silinemedi.';
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localePreferenceProvider);
    final active = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace),
    );
    final submitting = ref.watch(
      workspaceProvider.select((s) => s.isSubmitting),
    );
    final userId = ref.watch(authProvider.select((s) => s.userId));
    final canDeleteWorkspace = active != null &&
        (active.isOwner ||
            (active.ownerId != null && active.ownerId == userId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ayarlar'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Text(
            'Görünüm',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Tema',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 8),
          SegmentedButton<ThemeMode>(
            segments: const [
              ButtonSegment(
                value: ThemeMode.light,
                label: Text('Açık'),
                icon: Icon(Icons.light_mode_outlined),
              ),
              ButtonSegment(
                value: ThemeMode.dark,
                label: Text('Koyu'),
                icon: Icon(Icons.dark_mode_outlined),
              ),
              ButtonSegment(
                value: ThemeMode.system,
                label: Text('Sistem'),
                icon: Icon(Icons.settings_suggest_outlined),
              ),
            ],
            selected: {themeMode},
            onSelectionChanged: (selected) {
              ref.read(themeModeProvider.notifier).setThemeMode(selected.first);
            },
          ),
          const SizedBox(height: 28),
          Text(
            'Dil',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'Şimdilik yalnızca tercih kaydı (çeviri yakında).',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<AppLocaleOption>(
            // ignore: deprecated_member_use
            value: locale,
            decoration: const InputDecoration(
              labelText: 'Uygulama dili',
              prefixIcon: Icon(Icons.language),
              border: OutlineInputBorder(),
            ),
            items: [
              for (final option in AppLocaleOption.values)
                DropdownMenuItem(
                  value: option,
                  child: Text(option.label),
                ),
            ],
            onChanged: (value) {
              if (value == null) return;
              ref.read(localePreferenceProvider.notifier).setLocale(value);
            },
          ),
          if (canDeleteWorkspace) ...[
            const SizedBox(height: 36),
            Text(
              'Tehlikeli bölge',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Theme.of(context).colorScheme.error,
                  ),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed:
                  submitting ? null : () => _confirmDeleteWorkspace(context, ref),
              style: OutlinedButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error,
                side: BorderSide(color: Theme.of(context).colorScheme.error),
              ),
              icon: submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.delete_forever_outlined),
              label: const Text('Çalışma Alanını Sil'),
            ),
          ],
        ],
      ),
    );
  }
}
