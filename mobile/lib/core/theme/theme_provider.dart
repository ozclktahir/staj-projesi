import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/storage_keys.dart';
import '../storage/shared_preferences_provider.dart';

class ThemeModeNotifier extends Notifier<ThemeMode> {
  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);

  @override
  ThemeMode build() {
    final raw = _prefs.getString(StorageKeys.themeMode);
    return _fromStorage(raw);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (state == mode) return;
    await _prefs.setString(StorageKeys.themeMode, _toStorage(mode));
    // Tema geçişini gesture/build bitiminden sonra uygula (Switch rebuild crash).
    await Future<void>.delayed(Duration.zero);
    state = mode;
  }

  static ThemeMode _fromStorage(String? raw) {
    switch (raw) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }

  static String _toStorage(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }
}

final themeModeProvider =
    NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);
