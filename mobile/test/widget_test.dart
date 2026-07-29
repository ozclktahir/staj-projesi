import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('Unauthenticated user lands on login', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: StajMobileApp()));
    await tester.pump();
    // Auth bootstrap + redirect
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Giriş Yap'), findsWidgets);
  });
}
