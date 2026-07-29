import 'dart:convert';

/// JWT payload'dan `sub` (user id) okur — ekstra paket gerekmez.
String? userIdFromJwt(String token) {
  try {
    final parts = token.split('.');
    if (parts.length < 2) return null;
    final normalized = base64Url.normalize(parts[1]);
    final payload =
        jsonDecode(utf8.decode(base64Url.decode(normalized))) as Map;
    final sub = payload['sub'];
    if (sub is String && sub.isNotEmpty) return sub;
  } catch (_) {
    return null;
  }
  return null;
}
