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
      AppLocaleOption.tr => const Locale('tr'),
      AppLocaleOption.en => const Locale('en'),
    };

    // AppStrings MaterialApp'İN ÜSTÜNDE kalmalı.
    // builder içine InheritedWidget koymak locale değişiminde
    // `_dependents.isEmpty` assertion crash'ine yol açar.
    return wrapWithAppStrings(
      strings: strings,
      child: MaterialApp.router(
        title: 'Staj Projesi',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: themeMode,
        locale: appLocale,
        supportedLocales: const [
          Locale('tr'),
          Locale('en'),
        ],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        localeListResolutionCallback: (locales, supported) {
          for (final locale in locales ?? const <Locale>[]) {
            for (final candidate in supported) {
              if (candidate.languageCode == locale.languageCode) {
                return candidate;
              }
            }
          }
          return const Locale('en');
        },
        localeResolutionCallback: (locale, supported) {
          if (locale == null) return const Locale('en');
          for (final candidate in supported) {
            if (candidate.languageCode == locale.languageCode) {
              return candidate;
            }
          }
          return const Locale('en');
        },
        routerConfig: router,
      ),
    );
  }
}
