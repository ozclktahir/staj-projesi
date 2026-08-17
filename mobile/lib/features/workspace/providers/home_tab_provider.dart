import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Ana ekrandaki sekme sırası (IndexedStack): 0 = Panel, 1 = Projeler,
/// 2 = Kişisel Alan.
abstract final class HomeTab {
  static const dashboard = 0;
  static const projects = 1;
  static const personal = 2;
}

/// Ana ekranın aktif sekmesi.
///
/// Global aramadan kişisel not/görev sonucuna tıklanınca Kişisel Alan sekmesine
/// geçebilmek için sekme durumu HomeScreen'in yerel `setState`'inden buraya
/// taşındı (kişisel alan bir rota değil, IndexedStack sekmesi).
final homeTabProvider = StateProvider<int>((ref) => HomeTab.dashboard);
