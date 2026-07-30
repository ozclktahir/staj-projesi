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

/// JWT `exp` dolmuşsa true. Parse edilemezse güvenli taraf: expired.
bool isJwtExpired(
  String token, {
  Duration skew = const Duration(seconds: 30),
}) {
  try {
    final parts = token.split('.');
    if (parts.length < 2) return true;
    final normalized = base64Url.normalize(parts[1]);
    final payload =
        jsonDecode(utf8.decode(base64Url.decode(normalized))) as Map;
    final exp = payload['exp'];
    final expSeconds = exp is int
        ? exp
        : (exp is num ? exp.toInt() : int.tryParse('$exp'));
    if (expSeconds == null) return true;
    final expiry = DateTime.fromMillisecondsSinceEpoch(
      expSeconds * 1000,
      isUtc: true,
    );
    return DateTime.now().toUtc().isAfter(expiry.subtract(skew));
  } catch (_) {
    return true;
  }
}
