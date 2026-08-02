import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../providers/trash_provider.dart';

class TrashScreen extends ConsumerWidget {
  const TrashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(appStringsProvider);
    final trashAsync = ref.watch(trashProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(s.trashTitle),
        actions: [
          IconButton(
            tooltip: s.commonRetry,
            onPressed: () => ref.read(trashProvider.notifier).refresh(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: trashAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => AppEmptyState(
          icon: Icons.error_outline,
          title: s.trashLoadError,
          subtitle: error.toString(),
          action: FilledButton(
            onPressed: () => ref.read(trashProvider.notifier).refresh(),
            child: Text(s.commonRetry),
          ),
        ),
        data: (items) {
          if (items.isEmpty) {
            return AppEmptyState(
              icon: Icons.delete_outline,
              title: s.trashEmptyTitle,
              subtitle: s.trashEmptySubtitle,
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final task = items[index];
              return Card(
                child: ListTile(
                  title: Text(task.title),
                  subtitle: Text(
                    task.deletedAt != null
                        ? s.trashDeletedAt(task.deletedAt!)
                        : task.status.apiValue,
                  ),
                  trailing: FilledButton.tonal(
                    onPressed: () async {
                      try {
                        await ref
                            .read(trashProvider.notifier)
                            .restore(task.id);
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(s.trashRestored)),
                        );
                      } catch (e) {
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(e.toString())),
                        );
                      }
                    },
                    child: Text(s.trashRestore),
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
