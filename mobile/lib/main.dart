import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/l10n/app_strings.dart';
import 'core/locale/locale_provider.dart';
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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(realtimeConnectionProvider);
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(goRouterProvider);
    final themeMode = ref.watch(themeModeProvider);
    final localeOption = ref.watch(localePreferenceProvider);
    final strings = ref.watch(appStringsProvider);
    ref.watch(authTokenSyncProvider);
    ref.watch(realtimeConnectionProvider);
    ref.watch(workspaceScopeSyncProvider);
    ref.watch(workspaceForbiddenListenerProvider);
    ref.watch(unauthorizedSessionListenerProvider);

    final appLocale = switch (localeOption) {
      AppLocaleOption.tr => const Locale('tr', 'TR'),
      AppLocaleOption.en => const Locale('en', 'US'),
    };

    return MaterialApp.router(
      title: 'Staj Projesi',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      locale: appLocale,
      supportedLocales: const [
        Locale('tr', 'TR'),
        Locale('tr'),
        Locale('en', 'US'),
        Locale('en'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      localeResolutionCallback: (locale, supported) {
        if (locale == null) return supported.first;
        for (final candidate in supported) {
          if (candidate.languageCode == locale.languageCode &&
              (candidate.countryCode == null ||
                  candidate.countryCode!.isEmpty ||
                  candidate.countryCode == locale.countryCode)) {
            return candidate;
          }
        }
        for (final candidate in supported) {
          if (candidate.languageCode == locale.languageCode) {
            return candidate;
          }
        }
        // Material delegate tr desteklemezse en'e düş (AppStrings yine TR kalır).
        return const Locale('en', 'US');
      },
      // Dil/tema değişince tüm ağaç AppStrings ile yeniden bağlanır.
      builder: (context, child) {
        return wrapWithAppStrings(
          strings: strings,
          child: child ?? const SizedBox.shrink(),
        );
      },
      routerConfig: router,
    );
  }
}
