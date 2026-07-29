import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/locale/locale_provider.dart';
import '../../../core/theme/theme_provider.dart';

/// Tema ve dil tercihleri.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localePreferenceProvider);

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
        ],
      ),
    );
  }
}
