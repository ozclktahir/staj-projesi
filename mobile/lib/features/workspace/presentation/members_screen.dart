import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../providers/workspace_members_provider.dart';
import '../providers/workspace_provider.dart';

/// Basit üye listesi ekranı.
class MembersScreen extends ConsumerWidget {
  const MembersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(appStringsProvider);
    final workspaceName = ref.watch(
      workspaceProvider.select((ws) => ws.activeWorkspace?.name),
    );
    final membersAsync = ref.watch(workspaceMembersProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(s.membersTitle),
        actions: [
          IconButton(
            tooltip: 'Yenile',
            onPressed: () => ref.invalidate(workspaceMembersProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: membersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => AppEmptyState(
          icon: Icons.error_outline,
          title: s.membersLoadError,
          subtitle: error.toString(),
          action: FilledButton(
            onPressed: () => ref.invalidate(workspaceMembersProvider),
            child: Text(s.commonRetry),
          ),
        ),
        data: (members) {
          if (members.isEmpty) {
            return AppEmptyState(
              icon: Icons.group_outlined,
              title: 'Üye bulunamadı',
              subtitle: workspaceName == null
                  ? 'Önce bir çalışma alanı seçin.'
                  : 'Bu çalışma alanında görüntülenecek üye yok.',
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: members.length + 1,
            separatorBuilder: (_, index) =>
                index == 0 ? const SizedBox.shrink() : const Divider(height: 1),
            itemBuilder: (context, index) {
              if (index == 0) {
                return AppSectionHeader(
                  eyebrow: workspaceName ?? 'Çalışma alanı',
                  title: s.membersCount(members.length),
                  padding: const EdgeInsets.fromLTRB(0, 0, 0, 12),
                );
              }

              final member = members[index - 1];
              final initial = member.label.isNotEmpty
                  ? member.label.substring(0, 1).toUpperCase()
                  : '?';

              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  backgroundColor:
                      Theme.of(context).colorScheme.primary.withValues(
                            alpha: 0.15,
                          ),
                  foregroundColor: Theme.of(context).colorScheme.primary,
                  child: Text(initial),
                ),
                title: Text(member.label),
                subtitle: Text(
                  [
                    if (member.role != null && member.role!.isNotEmpty)
                      member.role!,
                    if (member.email != null && member.email!.isNotEmpty)
                      member.email!,
                  ].join(' • '),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
