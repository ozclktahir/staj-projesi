import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/storage_keys.dart';
import '../storage/shared_preferences_provider.dart';

/// Desteklenen arayüz dilleri (`AppStrings` / MaterialApp.locale ile bağlı).
enum AppLocaleOption {
  tr('tr', 'Türkçe'),
  en('en', 'English');

  const AppLocaleOption(this.code, this.label);
  final String code;
  final String label;

  static AppLocaleOption fromCode(String? code) {
    switch (code) {
      case 'en':
        return AppLocaleOption.en;
      case 'tr':
      default:
        return AppLocaleOption.tr;
    }
  }
}

class LocalePreferenceNotifier extends Notifier<AppLocaleOption> {
  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);

  @override
  AppLocaleOption build() {
    return AppLocaleOption.fromCode(_prefs.getString(StorageKeys.localeCode));
  }

  Future<void> setLocale(AppLocaleOption locale) async {
    state = locale;
    await _prefs.setString(StorageKeys.localeCode, locale.code);
  }
}

final localePreferenceProvider =
    NotifierProvider<LocalePreferenceNotifier, AppLocaleOption>(
  LocalePreferenceNotifier.new,
);
