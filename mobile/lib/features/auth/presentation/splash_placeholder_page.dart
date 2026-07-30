import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/app_strings.dart';
import '../providers/auth_provider.dart';

/// Oturum çözülürken gösterilen splash (form yok).
class SplashPlaceholderPage extends ConsumerWidget {
  const SplashPlaceholderPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(authProvider);
    final s = ref.watch(appStringsProvider);

    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(s.authCheckingSession),
          ],
        ),
      ),
    );
  }
}
