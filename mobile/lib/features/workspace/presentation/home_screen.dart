import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/presentation/dashboard_screen.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../notifications/presentation/notifications_sheet.dart';
import '../../notifications/providers/notification_provider.dart';
import '../data/project_dto.dart';
import '../providers/project_provider.dart';
import '../providers/workspace_provider.dart';
import 'create_project_dialog.dart';
import 'workspace_switcher.dart';

/// Ana ekran: Dashboard + proje listesi sekmeleri.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final workspaceState = ref.watch(workspaceProvider);
    final projectsAsync = ref.watch(projectsProvider);
    final active = workspaceState.activeWorkspace;
    final canCreateProject = active != null && _tabController.index == 1;
    final unreadCount = ref.watch(unreadNotificationCountProvider);

    return Scaffold(
      appBar: AppBar(
        title: InkWell(
          onTap: () => showWorkspaceSwitcher(context, ref),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    workspaceTitle(active),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.expand_more),
              ],
            ),
          ),
        ),
        actions: [
          if (active != null)
            IconButton(
              tooltip: 'Bildirimler',
              onPressed: () => showNotificationsSheet(context, ref),
              icon: Badge(
                isLabelVisible: unreadCount > 0,
                label: Text('$unreadCount'),
                child: const Icon(Icons.notifications_outlined),
              ),
            ),
          IconButton(
            tooltip: 'Çıkış',
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
        bottom: active == null
            ? null
            : TabBar(
                controller: _tabController,
                tabs: const [
                  Tab(icon: Icon(Icons.dashboard_outlined), text: 'Dashboard'),
                  Tab(icon: Icon(Icons.folder_outlined), text: 'Projeler'),
                ],
              ),
      ),
      floatingActionButton: canCreateProject
          ? FloatingActionButton(
              tooltip: 'Yeni proje',
              onPressed: () async {
                final created = await showCreateProjectDialog(context, ref);
                if (created == true && context.mounted) {
                  ScaffoldMessenger.of(context)
                    ..hideCurrentSnackBar()
                    ..showSnackBar(
                      const SnackBar(content: Text('Proje oluşturuldu.')),
                    );
                }
              },
              child: const Icon(Icons.add),
            )
          : null,
      body: active == null
          ? _HomeBody(
              workspaceLoading: workspaceState.isLoading,
              workspaceError: workspaceState.errorMessage,
              hasWorkspaces: workspaceState.workspaces.isNotEmpty,
              hasActiveWorkspace: false,
              projectsAsync: projectsAsync,
              onRefreshWorkspaces: () =>
                  ref.read(workspaceProvider.notifier).refresh(),
              onRefreshProjects: () =>
                  ref.read(projectsProvider.notifier).refresh(),
              onOpenSwitcher: () => showWorkspaceSwitcher(context, ref),
            )
          : TabBarView(
              controller: _tabController,
              children: [
                const DashboardScreen(),
                _HomeBody(
                  workspaceLoading: workspaceState.isLoading,
                  workspaceError: workspaceState.errorMessage,
                  hasWorkspaces: workspaceState.workspaces.isNotEmpty,
                  hasActiveWorkspace: true,
                  projectsAsync: projectsAsync,
                  onRefreshWorkspaces: () async {
                    await ref.read(workspaceProvider.notifier).refresh();
                    ref.invalidate(dashboardProvider);
                  },
                  onRefreshProjects: () =>
                      ref.read(projectsProvider.notifier).refresh(),
                  onOpenSwitcher: () => showWorkspaceSwitcher(context, ref),
                ),
              ],
            ),
    );
  }
}

class _HomeBody extends StatelessWidget {
  const _HomeBody({
    required this.workspaceLoading,
    required this.workspaceError,
    required this.hasWorkspaces,
    required this.hasActiveWorkspace,
    required this.projectsAsync,
    required this.onRefreshWorkspaces,
    required this.onRefreshProjects,
    required this.onOpenSwitcher,
  });

  final bool workspaceLoading;
  final String? workspaceError;
  final bool hasWorkspaces;
  final bool hasActiveWorkspace;
  final AsyncValue<List<ProjectDto>> projectsAsync;
  final Future<void> Function() onRefreshWorkspaces;
  final Future<void> Function() onRefreshProjects;
  final VoidCallback onOpenSwitcher;

  @override
  Widget build(BuildContext context) {
    if (workspaceLoading && !hasWorkspaces) {
      return const Center(child: CircularProgressIndicator());
    }

    if (workspaceError != null && !hasWorkspaces) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(workspaceError!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: onRefreshWorkspaces,
                child: const Text('Tekrar dene'),
              ),
            ],
          ),
        ),
      );
    }

    if (!hasWorkspaces) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Henüz çalışma alanınız yok.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: onOpenSwitcher,
                icon: const Icon(Icons.add),
                label: const Text('Çalışma alanı oluştur'),
              ),
            ],
          ),
        ),
      );
    }

    if (!hasActiveWorkspace) {
      return Center(
        child: FilledButton(
          onPressed: onOpenSwitcher,
          child: const Text('Çalışma alanı seç'),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        await onRefreshWorkspaces();
        await onRefreshProjects();
      },
      child: projectsAsync.when(
        loading: () => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 120),
            Center(child: CircularProgressIndicator()),
          ],
        ),
        error: (error, _) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 80),
            Text(
              error.toString(),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Center(
              child: FilledButton(
                onPressed: onRefreshProjects,
                child: const Text('Tekrar dene'),
              ),
            ),
          ],
        ),
        data: (projects) {
          if (projects.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              children: const [
                SizedBox(height: 80),
                Icon(Icons.folder_open_outlined, size: 48),
                SizedBox(height: 16),
                Text(
                  'Henüz bu çalışma alanında proje yok',
                  textAlign: TextAlign.center,
                ),
              ],
            );
          }

          return ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
            itemCount: projects.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final project = projects[index];
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.folder_outlined),
                  title: Text(project.name),
                  subtitle: project.description != null &&
                          project.description!.isNotEmpty
                      ? Text(
                          project.description!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        )
                      : null,
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(
                    AppRoutes.projectDetail(project.id),
                    extra: project,
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
