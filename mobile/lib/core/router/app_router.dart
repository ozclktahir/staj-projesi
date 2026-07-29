import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/login_placeholder_page.dart';
import '../../features/auth/presentation/splash_placeholder_page.dart';
import '../../features/workspace/presentation/home_placeholder_page.dart';

/// Rota path sabitleri.
abstract final class AppRoutes {
  static const splash = '/splash';
  static const login = '/login';
  static const home = '/home';
}

/// go_router iskeleti — auth redirect Adım 2'de eklenecek.
final GoRouter appRouter = GoRouter(
  initialLocation: AppRoutes.splash,
  routes: [
    GoRoute(
      path: AppRoutes.splash,
      name: 'splash',
      builder: (context, state) => const SplashPlaceholderPage(),
    ),
    GoRoute(
      path: AppRoutes.login,
      name: 'login',
      builder: (context, state) => const LoginPlaceholderPage(),
    ),
    GoRoute(
      path: AppRoutes.home,
      name: 'home',
      builder: (context, state) => const HomePlaceholderPage(),
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    body: Center(child: Text('Rota bulunamadı: ${state.uri}')),
  ),
);
