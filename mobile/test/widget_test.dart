import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('App boots to splash placeholder', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: StajMobileApp()));
    await tester.pumpAndSettle();
    expect(find.text('Splash (iskelet)'), findsOneWidget);
  });
}
