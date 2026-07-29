import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';

/// Oturum çözülürken gösterilen splash (form yok).
class SplashPlaceholderPage extends ConsumerWidget {
  const SplashPlaceholderPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Bootstrap tetiklensin diye watch
    ref.watch(authProvider);

    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Oturum kontrol ediliyor…'),
          ],
        ),
      ),
    );
  }
}
