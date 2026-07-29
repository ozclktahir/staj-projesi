import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../providers/task_provider.dart';
import 'task_card.dart';

Future<void> showTaskDetailSheet({
  required BuildContext context,
  required WidgetRef ref,
  required String projectId,
  required TaskDto task,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) {
      return _TaskDetailSheetBody(
        projectId: projectId,
        initialTask: task,
      );
    },
  );
}

class _TaskDetailSheetBody extends ConsumerStatefulWidget {
  const _TaskDetailSheetBody({
    required this.projectId,
    required this.initialTask,
  });

  final String projectId;
  final TaskDto initialTask;

  @override
  ConsumerState<_TaskDetailSheetBody> createState() =>
      _TaskDetailSheetBodyState();
}

class _TaskDetailSheetBodyState extends ConsumerState<_TaskDetailSheetBody> {
  late TaskStatus _status;
  var _busy = false;

  @override
  void initState() {
    super.initState();
    _status = widget.initialTask.status;
  }

  Future<void> _changeStatus(TaskStatus status) async {
    if (_busy || status == _status) return;
    setState(() {
      _busy = true;
      _status = status;
    });
    try {
      await ref.read(tasksProvider(widget.projectId).notifier).updateStatus(
            widget.initialTask.id,
            status,
          );
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(content: Text('Durum: ${status.label}')),
          );
      }
    } on TaskException catch (error) {
      setState(() => _status = widget.initialTask.status);
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (_) {
      setState(() => _status = widget.initialTask.status);
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Durum güncellenemedi.')),
          );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Görevi sil'),
        content: const Text('Bu görev arşivlenecek. Devam edilsin mi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('İptal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await ref
          .read(tasksProvider(widget.projectId).notifier)
          .deleteTask(widget.initialTask.id);
      if (mounted) Navigator.of(context).pop();
    } on TaskException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Görev silinemedi.')),
          );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.initialTask;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 0, 20, bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    task.title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                PriorityBadge(priority: task.priority),
              ],
            ),
            const SizedBox(height: 12),
            if (task.description != null && task.description!.isNotEmpty) ...[
              Text(
                task.description!,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
            ],
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.person_outline),
              title: const Text('Atanan'),
              subtitle: Text(task.assigneeLabel),
            ),
            const SizedBox(height: 8),
            Text(
              'Durum',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final status in TaskStatus.values)
                  ChoiceChip(
                    label: Text(status.label),
                    selected: _status == status,
                    onSelected: _busy
                        ? null
                        : (selected) {
                            if (selected) _changeStatus(status);
                          },
                  ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                if (_busy)
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                const Spacer(),
                TextButton(
                  onPressed: _busy ? null : _delete,
                  child: const Text('Sil'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _busy ? null : () => Navigator.of(context).pop(),
                  child: const Text('Kapat'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
