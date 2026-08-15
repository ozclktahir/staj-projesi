import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/router/app_router.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/presentation/dashboard_screen.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../invitations/presentation/invite_member_dialog.dart';
import '../../invitations/providers/invitation_provider.dart';
import '../../notifications/presentation/notifications_sheet.dart';
import '../../notifications/providers/notification_provider.dart';
import '../../personal/presentation/personal_screen.dart';
import '../data/project_dto.dart';
import '../providers/project_provider.dart';
import '../providers/workspace_capabilities_provider.dart';
import '../providers/workspace_provider.dart';
import 'create_project_dialog.dart';
import 'workspace_switcher.dart';

/// Ana ekran: Dashboard / Projeler / Kişisel Alan — web Sidebar + Header kabuğu.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  static const _wideBreakpoint = 900.0;

  var _index = 0;

  Future<void> _invite(String workspaceId) async {
    final sent = await showInviteMemberDialog(
      context,
      ref,
      workspaceId: workspaceId,
    );
    if (sent == true && mounted) {
      final s = ref.read(appStringsProvider);
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(content: Text(s.errorsInviteSent)),
        );
    }
  }

  void _selectNav(int index, {bool closeDrawer = false}) {
    if (closeDrawer) Navigator.of(context).pop();
    setState(() => _index = index);
  }

  @override
  Widget build(BuildContext context) {
    final workspaceState = ref.watch(workspaceProvider);
    final projectsAsync = ref.watch(projectsProvider);
    final caps = ref.watch(workspaceCapabilitiesProvider);
    final active = workspaceState.activeWorkspace;
    final canCreateProject =
        active != null && _index == 1 && caps.canCreateProject;
    final unreadCount = ref.watch(unreadNotificationCountProvider);
    final pendingInvites = ref.watch(pendingInvitationCountProvider);
    final badgeCount = unreadCount + pendingInvites;
    final scheme = Theme.of(context).colorScheme;
    final wide = MediaQuery.sizeOf(context).width >= _wideBreakpoint;
    final s = ref.watch(appStringsProvider);
    final navLabels = [s.navDashboard, s.navProjects, s.navPersonal];
    final navOverview = [s.commonOverview, s.navProjects, s.navPersonalArea];

    final content = active == null
        ? _ProjectsBody(
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
        : IndexedStack(
            index: _index,
            children: [
              const DashboardScreen(),
              _ProjectsBody(
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
              const PersonalScreen(),
            ],
          );

    return Scaffold(
      drawer: Drawer(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'STAJ-PROJESI',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.w700,
                            color: scheme.primary,
                          ),
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: () {
                        Navigator.of(context).pop();
                        showWorkspaceSwitcher(context, ref);
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                workspaceTitle(active),
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w700),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Icon(
                              Icons.unfold_more,
                              size: 18,
                              color: scheme.onSurfaceVariant,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Divider(height: 1, color: scheme.outline),
              const SizedBox(height: 8),
              if (active != null) ...[
                for (var i = 0; i < navLabels.length; i++)
                  _DrawerNavTile(
                    icon: switch (i) {
                      0 => Icons.dashboard_outlined,
                      1 => Icons.folder_outlined,
                      _ => Icons.person_outline,
                    },
                    selectedIcon: switch (i) {
                      0 => Icons.dashboard,
                      1 => Icons.folder,
                      _ => Icons.person,
                    },
                    label: navLabels[i],
                    selected: _index == i,
                    onTap: () => _selectNav(i, closeDrawer: true),
                  ),
              ],
              _DrawerNavTile(
                icon: Icons.settings_outlined,
                selectedIcon: Icons.settings,
                label: s.navSettings,
                selected: false,
                onTap: () {
                  Navigator.of(context).pop();
                  context.push(AppRoutes.settings);
                },
              ),
              if (active != null)
                _DrawerNavTile(
                  icon: Icons.admin_panel_settings_outlined,
                  selectedIcon: Icons.admin_panel_settings,
                  label: s.settingsAdmin,
                  selected: false,
                  onTap: () {
                    Navigator.of(context).pop();
                    context.push(AppRoutes.admin);
                  },
                ),
              if (active != null && caps.canInvite)
                _DrawerNavTile(
                  icon: Icons.person_add_alt_1_outlined,
                  selectedIcon: Icons.person_add_alt_1,
                  label: s.navInvite,
                  selected: false,
                  onTap: () {
                    Navigator.of(context).pop();
                    _invite(active.id);
                  },
                ),
              const Spacer(),
              Divider(height: 1, color: scheme.outline),
              _DrawerNavTile(
                icon: Icons.logout,
                selectedIcon: Icons.logout,
                label: s.navLogout,
                selected: false,
                onTap: () {
                  Navigator.of(context).pop();
                  ref.read(authProvider.notifier).logout();
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
      appBar: AppBar(
        titleSpacing: wide ? 8 : 0,
        title: InkWell(
          onTap: () => showWorkspaceSwitcher(context, ref),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  active == null ? s.commonOverview : navOverview[_index],
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        workspaceTitle(active),
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                    const SizedBox(width: 2),
                    Icon(
                      Icons.expand_more,
                      size: 20,
                      color: scheme.onSurfaceVariant,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        actions: [
          if (active != null) ...[
            IconButton(
              tooltip: s.searchPlaceholder,
              onPressed: () => context.push(AppRoutes.search),
              icon: const Icon(Icons.search),
            ),
            if (!wide && caps.canInvite)
              IconButton(
                tooltip: s.navInvite,
                onPressed: () => _invite(active.id),
                icon: const Icon(Icons.person_add_alt_1_outlined),
              ),
            IconButton(
              tooltip: s.commonNotifications,
              onPressed: () => showNotificationsSheet(context, ref),
              icon: Badge(
                isLabelVisible: badgeCount > 0,
                label: Text('$badgeCount'),
                child: const Icon(Icons.notifications_outlined),
              ),
            ),
          ],
          if (!wide)
            IconButton(
              tooltip: s.navLogout,
              onPressed: () => ref.read(authProvider.notifier).logout(),
              icon: const Icon(Icons.logout),
            ),
          if (wide) ...[
            IconButton(
              tooltip: s.navSettings,
              onPressed: () => context.push(AppRoutes.settings),
              icon: const Icon(Icons.settings_outlined),
            ),
            IconButton(
              tooltip: s.navLogout,
              onPressed: () => ref.read(authProvider.notifier).logout(),
              icon: const Icon(Icons.logout),
            ),
          ],
        ],
      ),
      floatingActionButton: canCreateProject
          ? FloatingActionButton(
              tooltip: s.commonNewProject,
              onPressed: () async {
                final created = await showCreateProjectDialog(context, ref);
                if (created == true && context.mounted) {
                  ScaffoldMessenger.of(context)
                    ..hideCurrentSnackBar()
                    ..showSnackBar(
                      SnackBar(content: Text(s.errorsProjectCreated)),
                    );
                }
              },
              child: const Icon(Icons.add),
            )
          : null,
      bottomNavigationBar: (!wide && active != null)
          ? NavigationBar(
              selectedIndex: _index,
              onDestinationSelected: (value) => setState(() => _index = value),
              destinations: [
                NavigationDestination(
                  icon: const Icon(Icons.dashboard_outlined),
                  selectedIcon: const Icon(Icons.dashboard),
                  label: s.navDashboard,
                ),
                NavigationDestination(
                  icon: const Icon(Icons.folder_outlined),
                  selectedIcon: const Icon(Icons.folder),
                  label: s.navProjects,
                ),
                NavigationDestination(
                  icon: const Icon(Icons.person_outline),
                  selectedIcon: const Icon(Icons.person),
                  label: s.navPersonal,
                ),
              ],
            )
          : null,
      body: wide && active != null
          ? Row(
              children: [
                NavigationRail(
                  selectedIndex: _index,
                  onDestinationSelected: (value) =>
                      setState(() => _index = value),
                  labelType: NavigationRailLabelType.all,
                  backgroundColor: scheme.surface,
                  indicatorColor: scheme.primary.withValues(alpha: 0.15),
                  selectedIconTheme: IconThemeData(color: scheme.primary),
                  selectedLabelTextStyle: TextStyle(
                    color: scheme.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                  destinations: [
                    NavigationRailDestination(
                      icon: const Icon(Icons.dashboard_outlined),
                      selectedIcon: const Icon(Icons.dashboard),
                      label: Text(s.navDashboard),
                    ),
                    NavigationRailDestination(
                      icon: const Icon(Icons.folder_outlined),
                      selectedIcon: const Icon(Icons.folder),
                      label: Text(s.navProjects),
                    ),
                    NavigationRailDestination(
                      icon: const Icon(Icons.person_outline),
                      selectedIcon: const Icon(Icons.person),
                      label: Text(s.navPersonal),
                    ),
                  ],
                  trailing: Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (caps.canInvite)
                              IconButton(
                                tooltip: s.navInvite,
                                onPressed: () => _invite(active.id),
                                icon: const Icon(
                                  Icons.person_add_alt_1_outlined,
                                ),
                              ),
                            IconButton(
                              tooltip: s.navSettings,
                              onPressed: () =>
                                  context.push(AppRoutes.settings),
                              icon: const Icon(Icons.settings_outlined),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                VerticalDivider(width: 1, color: scheme.outline),
                Expanded(child: content),
              ],
            )
          : content,
    );
  }
}

class _DrawerNavTile extends StatelessWidget {
  const _DrawerNavTile({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      child: ListTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        selected: selected,
        selectedTileColor: scheme.primary.withValues(alpha: 0.15),
        leading: Icon(
          selected ? selectedIcon : icon,
          color: selected ? scheme.primary : null,
        ),
        title: Text(
          label,
          style: TextStyle(
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? scheme.primary : null,
          ),
        ),
        onTap: onTap,
      ),
    );
  }
}

class _ProjectsBody extends StatelessWidget {
  const _ProjectsBody({
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
    final s = AppStrings.of(context);

    if (workspaceLoading && !hasWorkspaces) {
      return const Center(child: CircularProgressIndicator());
    }

    if (workspaceError != null && !hasWorkspaces) {
      return AppEmptyState(
        icon: Icons.error_outline,
        title: s.homeWorkspacesLoadError,
        subtitle: workspaceError,
        action: FilledButton(
          onPressed: onRefreshWorkspaces,
          child: Text(s.commonRetry),
        ),
      );
    }

    if (!hasWorkspaces) {
      return AppEmptyState(
        icon: Icons.workspaces_outlined,
        title: s.homeNoWorkspacesTitle,
        subtitle: s.homeNoWorkspacesSubtitle,
        action: FilledButton.icon(
          onPressed: onOpenSwitcher,
          icon: const Icon(Icons.add),
          label: Text(s.commonCreateWorkspace),
        ),
      );
    }

    if (!hasActiveWorkspace) {
      return AppEmptyState(
        icon: Icons.swap_horiz,
        title: s.homeSelectWorkspaceTitle,
        subtitle: s.homeSelectWorkspaceSubtitle,
        action: FilledButton(
          onPressed: onOpenSwitcher,
          child: Text(s.commonSelectWorkspace),
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
          children: [
            AppEmptyState(
              icon: Icons.error_outline,
              title: s.homeProjectsLoadError,
              subtitle: error.toString(),
              action: FilledButton(
                onPressed: onRefreshProjects,
                child: Text(s.commonRetry),
              ),
            ),
          ],
        ),
        data: (projects) {
          if (projects.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                AppEmptyState(
                  icon: Icons.folder_open_outlined,
                  title: 'Henüz proje yok',
                  subtitle:
                      'Bu çalışma alanında henüz proje bulunmuyor. Yeni bir proje ekleyerek başlayın.',
                ),
              ],
            );
          }

          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 88),
            children: [
              AppSectionHeader(
                eyebrow: 'Çalışma alanı',
                title: 'Projeler',
                padding: const EdgeInsets.fromLTRB(0, 8, 0, 12),
              ),
              LayoutBuilder(
                builder: (context, constraints) {
                  final crossAxisCount = constraints.maxWidth >= 720
                      ? 3
                      : constraints.maxWidth >= 480
                          ? 2
                          : 1;
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: projects.length,
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: crossAxisCount,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      // Daha yüksek kart: uzun açıklamalar taşmasın.
                      mainAxisExtent: crossAxisCount == 1 ? 168 : 180,
                    ),
                    itemBuilder: (context, index) {
                      final project = projects[index];
                      return _ProjectCard(project: project);
                    },
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project});

  final ProjectDto project;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final description = project.description?.trim();
    final createdLabel = () {
      final raw = project.createdAt;
      if (raw == null || raw.isEmpty) return 'Tarih yok';
      final dt = DateTime.tryParse(raw)?.toLocal();
      if (dt == null) return 'Tarih yok';
      return DateFormat('dd.MM.yyyy').format(dt);
    }();

    return Card(
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      child: InkWell(
        onTap: () => context.push(
          AppRoutes.projectDetail(project.id),
          extra: project,
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.folder_special_outlined,
                  color: scheme.primary,
                  size: 22,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                project.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Expanded(
                child: Align(
                  alignment: Alignment.topLeft,
                  child: Text(
                    (description != null && description.isNotEmpty)
                        ? description
                        : 'Açıklama eklenmemiş',
                    maxLines: 3,
                    softWrap: true,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                          height: 1.25,
                        ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                createdLabel,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
