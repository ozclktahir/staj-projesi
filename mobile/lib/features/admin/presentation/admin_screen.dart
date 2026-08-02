import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../workspace/providers/workspace_capabilities_provider.dart';
import '../../workspace/providers/workspace_members_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/admin_repository.dart';
import '../providers/admin_provider.dart';

/// Üyeler + (admin ise) yönetim istatistikleri — tek “Yönetim Paneli”.
class AdminScreen extends ConsumerWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(appStringsProvider);
    final caps = ref.watch(workspaceCapabilitiesProvider);
    final membersAsync = ref.watch(workspaceMembersProvider);
    final workspaceId = ref.watch(workspaceProvider).activeWorkspace?.id;
    final workspaceName = ref.watch(
      workspaceProvider.select((ws) => ws.activeWorkspace?.name),
    );
    final statsAsync =
        caps.isAdmin ? ref.watch(adminStatsProvider) : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(s.adminTitle),
        actions: [
          IconButton(
            onPressed: () {
              ref.invalidate(workspaceMembersProvider);
              if (caps.isAdmin) {
                ref.read(adminStatsProvider.notifier).refresh();
              }
            },
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (caps.isAdmin) ...[
            Text(
              s.adminStatsSection,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 12),
            statsAsync!.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text(e.toString()),
              data: (stats) => Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _StatChip(
                    label: s.adminTotalUsers,
                    value: '${stats.totalUsers}',
                  ),
                  _StatChip(
                    label: s.adminActiveTasks,
                    value: '${stats.activeTasks}',
                  ),
                  _StatChip(
                    label: s.adminTotalProjects,
                    value: '${stats.totalProjects}',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
          ],
          Text(
            s.adminMembersSection,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          if (workspaceName != null) ...[
            const SizedBox(height: 4),
            Text(
              workspaceName,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
          const SizedBox(height: 8),
          membersAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => AppEmptyState(
              icon: Icons.error_outline,
              title: s.membersLoadError,
              subtitle: e.toString(),
              action: FilledButton(
                onPressed: () => ref.invalidate(workspaceMembersProvider),
                child: Text(s.commonRetry),
              ),
            ),
            data: (members) {
              if (members.isEmpty) {
                return Text(s.membersEmpty);
              }
              return Column(
                children: [
                  for (final m in members)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: Theme.of(context)
                            .colorScheme
                            .primary
                            .withValues(alpha: 0.15),
                        foregroundColor:
                            Theme.of(context).colorScheme.primary,
                        child: Text(
                          m.displayName.isNotEmpty
                              ? m.displayName[0].toUpperCase()
                              : '?',
                        ),
                      ),
                      title: Text(m.displayName),
                      subtitle: Text(m.role ?? '—'),
                      trailing: caps.isAdmin
                          ? IconButton(
                              tooltip: s.adminRemoveMember,
                              icon: const Icon(Icons.person_remove_outlined),
                              onPressed: workspaceId == null
                                  ? null
                                  : () => _confirmRemove(
                                        context,
                                        ref,
                                        workspaceId: workspaceId,
                                        userId: m.id,
                                        name: m.displayName,
                                      ),
                            )
                          : null,
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Future<void> _confirmRemove(
    BuildContext context,
    WidgetRef ref, {
    required String workspaceId,
    required String userId,
    required String name,
  }) async {
    final s = ref.read(appStringsProvider);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.adminRemoveMember),
        content: Text(s.adminRemoveMemberBody(name)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(s.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(s.commonDelete),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    try {
      await ref.read(adminRepositoryProvider).removeUser(
            workspaceId: workspaceId,
            userId: userId,
          );
      ref.invalidate(workspaceMembersProvider);
      ref.invalidate(adminStatsProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(s.adminMemberRemoved)),
      );
    } on AdminException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    }
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 140,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 4),
              Text(
                value,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
