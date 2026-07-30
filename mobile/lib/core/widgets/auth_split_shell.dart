import 'package:flutter/material.dart';

/// Web `AuthSplitShell` karşılığı — koyu panel + turuncu gradient + form alanı.
class AuthSplitShell extends StatelessWidget {
  const AuthSplitShell({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 860;
    final brand = _BrandPanel(compact: !wide);

    if (!wide) {
      return Scaffold(
        backgroundColor: const Color(0xFF09090B),
        body: SafeArea(
          child: Column(
            children: [
              brand,
              Expanded(
                child: ColoredBox(
                  color: const Color(0xFF09090B),
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: child,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      body: Row(
        children: [
          Expanded(child: brand),
          Expanded(
            child: ColoredBox(
              color: const Color(0xFF09090B),
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 40,
                  ),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: child,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BrandPanel extends StatelessWidget {
  const _BrandPanel({required this.compact});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      constraints: BoxConstraints(
        minHeight: compact ? 180 : double.infinity,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF09090B),
        gradient: RadialGradient(
          center: Alignment(-0.4, -0.35),
          radius: 1.1,
          colors: [
            Color(0x59EA580C),
            Color(0x26FF6A00),
            Color(0x0009090B),
          ],
          stops: [0, 0.35, 1],
        ),
      ),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: 24,
          vertical: compact ? 28 : 48,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'STAJ-PROJESI',
              style: TextStyle(
                letterSpacing: 4,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            SizedBox(height: compact ? 10 : 16),
            Text.rich(
              TextSpan(
                style: TextStyle(
                  fontSize: compact ? 28 : 40,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                  height: 1.15,
                ),
                children: [
                  const TextSpan(text: 'Task '),
                  TextSpan(
                    text: 'Management',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: compact ? 8 : 12),
            Text(
              'Ekiplerin için net, hızlı ve odaklı görev yönetimi.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: compact ? 13 : 15,
                height: 1.45,
                color: const Color(0xFFA1A1AA),
              ),
            ),
            SizedBox(height: compact ? 12 : 18),
            Container(
              width: 64,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Auth formunu koyu panel üzerinde kart gibi gösteren sarmalayıcı.
class AuthFormCard extends StatelessWidget {
  const AuthFormCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: const Color(0xFF121212),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: scheme.outline.withValues(alpha: 0.6)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
        child: child,
      ),
    );
  }
}
