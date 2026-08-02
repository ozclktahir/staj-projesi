import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Basit offline önbellek — son başarılı workspace listesi.
/// Tam offline senkron değil; ağ yokken son bilinen veriyi gösterir.
abstract final class LocalCacheKeys {
  static const workspacesJson = 'cache.workspaces_json';
}

class LocalCache {
  LocalCache(this._prefs);

  final SharedPreferences _prefs;

  Future<void> saveWorkspacesJson(String json) async {
    await _prefs.setString(LocalCacheKeys.workspacesJson, json);
  }

  String? readWorkspacesJson() {
    return _prefs.getString(LocalCacheKeys.workspacesJson);
  }

  List<Map<String, dynamic>> readWorkspaceMaps() {
    final raw = readWorkspacesJson();
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return const [];
      return decoded
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (_) {
      return const [];
    }
  }
}
