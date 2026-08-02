import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../providers/progress_report_provider.dart';

class ProgressReportsScreen extends ConsumerWidget {
  const ProgressReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(appStringsProvider);
    final reportsAsync = ref.watch(progressReportsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(s.progressTitle)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDialog(context, ref),
        icon: const Icon(Icons.add),
        label: Text(s.progressCreate),
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
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final report = items[index];
              return Card(
                child: ListTile(
                  title: Text(report.title),
                  subtitle: Text(
                    '${report.reportType} · ${report.content}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: IconButton(
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
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _showCreateDialog(BuildContext context, WidgetRef ref) async {
    final s = ref.read(appStringsProvider);
    final titleCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    var type = 'DAILY';

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            return AlertDialog(
              title: Text(s.progressCreate),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<String>(
                      // ignore: deprecated_member_use
                      value: type,
                      decoration: InputDecoration(labelText: s.progressType),
                      items: [
                        for (final t in const ['DAILY', 'WEEKLY', 'MONTHLY'])
                          DropdownMenuItem(value: t, child: Text(t)),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        setLocal(() => type = v);
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: titleCtrl,
                      decoration: InputDecoration(labelText: s.progressTitleField),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: contentCtrl,
                      maxLines: 4,
                      decoration:
                          InputDecoration(labelText: s.progressContentField),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: Text(s.commonCancel),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: Text(s.commonCreate),
                ),
              ],
            );
          },
        );
      },
    );

    if (created != true || !context.mounted) {
      titleCtrl.dispose();
      contentCtrl.dispose();
      return;
    }

    try {
      await ref.read(progressReportsProvider.notifier).create(
            reportType: type,
            title: titleCtrl.text.trim(),
            content: contentCtrl.text.trim(),
          );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(s.progressCreated)),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      titleCtrl.dispose();
      contentCtrl.dispose();
    }
  }
}
