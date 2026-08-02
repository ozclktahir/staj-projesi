import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin/presentation/admin_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/auth/presentation/splash_placeholder_page.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/progress/presentation/progress_reports_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/tasks/presentation/project_detail_screen.dart';
import '../../features/tasks/presentation/trash_screen.dart';
import '../../features/workspace/presentation/home_screen.dart';
import '../../features/workspace/presentation/members_screen.dart';
import '../../features/workspace/providers/workspace_provider.dart';

/// Rota path sabitleri.
abstract final class AppRoutes {
  static const splash = '/splash';
  static const login = '/login';
  static const register = '/register';
  static const home = '/home';
  static const onboarding = '/onboarding';
  static const settings = '/settings';
  static const members = '/members';
  static const trash = '/trash';
  static const admin = '/admin';
  static const progress = '/progress';
  static const project = '/project/:id';

  static String projectDetail(String projectId) => '/project/$projectId';
}

class GoRouterRefreshNotifier extends ChangeNotifier {
  GoRouterRefreshNotifier(Ref ref) {
    _authSubscription = ref.listen<AuthState>(
      authProvider,
      (_, _) => notifyListeners(),
    );
    _workspaceSubscription = ref.listen(
      workspaceProvider,
      (_, _) => notifyListeners(),
    );
  }

  late final ProviderSubscription<AuthState> _authSubscription;
  late final ProviderSubscription<WorkspaceState> _workspaceSubscription;

  @override
  void dispose() {
    _authSubscription.close();
    _workspaceSubscription.close();
    super.dispose();
  }
}

final goRouterProvider = Provider<GoRouter>((ref) {
  final refresh = GoRouterRefreshNotifier(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final workspace = ref.read(workspaceProvider);
      final location = state.matchedLocation;
      final isSplash = location == AppRoutes.splash;
      final isAuthRoute =
          location == AppRoutes.login || location == AppRoutes.register;
      final isOnboarding = location == AppRoutes.onboarding;

      if (auth.status == AuthStatus.unknown) {
        return isSplash ? null : AppRoutes.splash;
      }

      if (auth.status == AuthStatus.unauthenticated) {
        if (isAuthRoute) return null;
        return AppRoutes.login;
      }

      // Authenticated ama token henüz yoksa (geçiş) splash'ta kal.
      if (auth.token == null || auth.token!.isEmpty) {
        return isSplash ? null : AppRoutes.splash;
      }

      // Authenticated — workspace bootstrap bitmeden karar verme.
      if (workspace.isLoading) {
        return isSplash ? null : AppRoutes.splash;
      }

      final needsOnboarding = workspace.workspaces.isEmpty;

      if (isAuthRoute || isSplash) {
        return needsOnboarding ? AppRoutes.onboarding : AppRoutes.home;
      }

      if (needsOnboarding && !isOnboarding && location != AppRoutes.settings) {
        return AppRoutes.onboarding;
      }

      if (!needsOnboarding && isOnboarding) {
        return AppRoutes.home;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        name: 'splash',
        builder: (context, state) => const SplashPlaceholderPage(),
      ),
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.onboarding,
        name: 'onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: AppRoutes.home,
        name: 'home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.settings,
        name: 'settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: AppRoutes.members,
        name: 'members',
        builder: (context, state) => const MembersScreen(),
      ),
      GoRoute(
        path: AppRoutes.trash,
        name: 'trash',
        builder: (context, state) => const TrashScreen(),
      ),
      GoRoute(
        path: AppRoutes.admin,
        name: 'admin',
        builder: (context, state) => const AdminScreen(),
      ),
      GoRoute(
        path: AppRoutes.progress,
        name: 'progress',
        builder: (context, state) => const ProgressReportsScreen(),
      ),
      GoRoute(
        path: AppRoutes.project,
        name: 'project',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          final project = projectFromExtra(state.extra);
          return ProjectDetailScreen(
            projectId: id,
            projectName: project?.name ??
                state.uri.queryParameters['name'],
          );
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Rota bulunamadı: ${state.uri}')),
    ),
  );
});
