import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/locale/locale_provider.dart';
import '../../../core/network/workspace_session_cleanup.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/theme_provider.dart';
import '../../workspace/providers/workspace_capabilities_provider.dart';
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
    final s = ref.read(appStringsProvider);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(s.settingsDeleteWorkspaceTitle),
        content: Text(
          s.t('settings.deleteWorkspaceBody', {'name': active.name}),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(s.commonCancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(s.commonDelete),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    invalidateWorkspaceScopedProvidersWithWidgetRef(ref);

    final ok =
        await ref.read(workspaceProvider.notifier).deleteWorkspace(active.id);
    if (!context.mounted) return;

    invalidateWorkspaceScopedProvidersWithWidgetRef(ref);

    if (ok) {
      final remaining = ref.read(workspaceProvider).workspaces;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(s.settingsWorkspaceDeleted)));
      if (remaining.isEmpty) {
        context.go(AppRoutes.onboarding);
      } else {
        context.go(AppRoutes.home);
      }
    } else {
      final message =
          ref.read(workspaceProvider).errorMessage ?? s.settingsDeleteFailed;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localePreferenceProvider);
    final s = ref.watch(appStringsProvider);
    final submitting = ref.watch(
      workspaceProvider.select((state) => state.isSubmitting),
    );
    final canDeleteWorkspace =
        ref.watch(workspaceCapabilitiesProvider).canDeleteWorkspace;

    return Scaffold(
      appBar: AppBar(
        title: Text(s.settingsTitle),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Text(
            s.settingsAppearance,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            secondary: Icon(
              themeMode == ThemeMode.dark
                  ? Icons.dark_mode_outlined
                  : Icons.light_mode_outlined,
            ),
            title: Text(s.settingsTheme),
            subtitle: Text(
              themeMode == ThemeMode.dark
                  ? s.settingsThemeDark
                  : s.settingsThemeLight,
            ),
            value: themeMode == ThemeMode.dark,
            onChanged: (enabled) {
              // Switch animasyonu bitmeden tema rebuild'i crash yaratmasın.
              Future.microtask(() {
                ref.read(themeModeProvider.notifier).setThemeMode(
                      enabled ? ThemeMode.dark : ThemeMode.light,
                    );
              });
            },
          ),
          const SizedBox(height: 28),
          Text(
            s.settingsLanguage,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            s.settingsLanguageDesc,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 12),
          SegmentedButton<AppLocaleOption>(
            segments: [
              for (final option in AppLocaleOption.values)
                ButtonSegment(
                  value: option,
                  label: Text(option.label),
                  icon: const Icon(Icons.translate, size: 16),
                ),
            ],
            selected: {locale},
            onSelectionChanged: (selected) {
              if (selected.isEmpty) return;
              final value = selected.first;
              Future.microtask(() {
                ref.read(localePreferenceProvider.notifier).setLocale(value);
              });
            },
          ),
          const SizedBox(height: 28),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.admin_panel_settings_outlined),
            title: Text(s.settingsAdmin),
            subtitle: Text(s.settingsAdminDesc),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.admin),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.delete_outline),
            title: Text(s.settingsTrash),
            subtitle: Text(s.settingsTrashDesc),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.trash),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.assignment_outlined),
            title: Text(s.settingsProgress),
            subtitle: Text(s.settingsProgressDesc),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.progress),
          ),
          if (canDeleteWorkspace) ...[
            const SizedBox(height: 36),
            Text(
              s.settingsDangerZone,
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
              label: Text(s.settingsDeleteWorkspace),
            ),
          ],
        ],
      ),
    );
  }
}
