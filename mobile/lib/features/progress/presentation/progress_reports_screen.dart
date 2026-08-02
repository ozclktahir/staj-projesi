import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../workspace/providers/workspace_capabilities_provider.dart';
import '../providers/progress_report_provider.dart';

/// Yalnızca mevcut raporları listeler; yeni rapor oluşturma kaldırıldı.
class ProgressReportsScreen extends ConsumerWidget {
  const ProgressReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(appStringsProvider);
    final reportsAsync = ref.watch(progressReportsProvider);
    final canManage = ref.watch(workspaceCapabilitiesProvider).isAdmin;

    return Scaffold(
      appBar: AppBar(
        title: Text(s.progressTitle),
        actions: [
          IconButton(
            tooltip: s.commonRetry,
            onPressed: () =>
                ref.read(progressReportsProvider.notifier).refresh(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: reportsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppEmptyState(
          icon: Icons.error_outline,
          title: s.progressLoadError,
          subtitle: e.toString(),
          action: FilledButton(
            onPressed: () =>
                ref.read(progressReportsProvider.notifier).refresh(),
            child: Text(s.commonRetry),
          ),
        ),
        data: (items) {
          if (items.isEmpty) {
            return AppEmptyState(
              icon: Icons.assignment_outlined,
              title: s.progressEmptyTitle,
              subtitle: s.progressEmptySubtitle,
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final report = items[index];
              return Card(
                child: ListTile(
                  title: Text(
                    report.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    '${report.reportType} · ${report.content}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: canManage
                      ? IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () async {
                            try {
                              await ref
                                  .read(progressReportsProvider.notifier)
                                  .remove(report.id);
                            } catch (e) {
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.toString())),
                              );
                            }
                          },
                        )
                      : null,
                ),
              );
            },
          );
        },
      ),
    );
  }
}
