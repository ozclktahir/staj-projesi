import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/network/api_client_provider.dart';
import 'core/network/realtime_provider.dart';
import 'core/network/workspace_scope_sync.dart';
import 'core/router/app_router.dart';
import 'core/storage/shared_preferences_provider.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: const StajMobileApp(),
    ),
  );
}

class StajMobileApp extends ConsumerStatefulWidget {
  const StajMobileApp({super.key});

  @override
  ConsumerState<StajMobileApp> createState() => _StajMobileAppState();
}

class _StajMobileAppState extends ConsumerState<StajMobileApp> {
  @override
  void initState() {
    super.initState();
    // Socket bağlantısını ilk frame sonrasında başlat (build sırasında invalidate riski azalır).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(realtimeConnectionProvider);
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(goRouterProvider);
    final themeMode = ref.watch(themeModeProvider);
    // Bağımlılıklar değişince provider yeniden çalışır (socket reconnect).
    ref.watch(realtimeConnectionProvider);
    ref.watch(workspaceScopeSyncProvider);
    ref.watch(workspaceForbiddenListenerProvider);
    ref.watch(unauthorizedSessionListenerProvider);

    return MaterialApp.router(
      title: 'Staj Projesi',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}
