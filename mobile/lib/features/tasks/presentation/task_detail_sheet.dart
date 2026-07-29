import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../workspace/providers/workspace_provider.dart';
import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../data/task_scope.dart';
import '../providers/comment_provider.dart';
import '../providers/file_provider.dart';
import '../providers/task_provider.dart';
import 'task_card.dart';
import 'task_comments_panel.dart';
import 'task_files_panel.dart';

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

class _TaskDetailSheetBodyState extends ConsumerState<_TaskDetailSheetBody>
    with SingleTickerProviderStateMixin {
  late TaskStatus _status;
  late final TabController _tabController;
  var _busy = false;

  @override
  void initState() {
    super.initState();
    _status = widget.initialTask.status;
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
    final workspaceId = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace?.id),
    );
    final height = MediaQuery.sizeOf(context).height * 0.88;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    final scope = workspaceId == null
        ? null
        : TaskScope(workspaceId: workspaceId, taskId: task.id);

    // Yorum ve dosyaları paralel başlat
    if (scope != null) {
      ref.watch(commentsProvider(scope));
      ref.watch(taskFilesProvider(scope));
    }

    return SizedBox(
      height: height,
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 12, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      task.title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  PriorityBadge(priority: task.priority),
                  IconButton(
                    tooltip: 'Kapat',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            TabBar(
              controller: _tabController,
              tabs: const [
                Tab(text: 'Detay'),
                Tab(text: 'Yorumlar'),
                Tab(text: 'Dosyalar'),
              ],
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _DetailsTab(
                    task: task,
                    status: _status,
                    busy: _busy,
                    onStatusSelected: _changeStatus,
                    onDelete: _delete,
                  ),
                  if (scope != null)
                    TaskCommentsPanel(scope: scope)
                  else
                    const Center(child: Text('Aktif çalışma alanı yok.')),
                  if (scope != null)
                    TaskFilesPanel(scope: scope)
                  else
                    const Center(child: Text('Aktif çalışma alanı yok.')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailsTab extends StatelessWidget {
  const _DetailsTab({
    required this.task,
    required this.status,
    required this.busy,
    required this.onStatusSelected,
    required this.onDelete,
  });

  final TaskDto task;
  final TaskStatus status;
  final bool busy;
  final ValueChanged<TaskStatus> onStatusSelected;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
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
        Text('Durum', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final value in TaskStatus.values)
              ChoiceChip(
                label: Text(value.label),
                selected: status == value,
                onSelected: busy
                    ? null
                    : (selected) {
                        if (selected) onStatusSelected(value);
                      },
              ),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            if (busy)
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            const Spacer(),
            TextButton(
              onPressed: busy ? null : onDelete,
              child: const Text('Sil'),
            ),
          ],
        ),
      ],
    );
  }
}
