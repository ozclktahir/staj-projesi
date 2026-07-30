import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../workspace/providers/workspace_members_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../data/task_scope.dart';
import '../providers/comment_provider.dart';
import '../providers/file_provider.dart';
import '../providers/subtask_provider.dart';
import '../providers/task_provider.dart';
import 'edit_task_dialog.dart';
import 'task_card.dart';
import 'task_comments_panel.dart';
import 'task_files_panel.dart';
import 'task_subtasks_panel.dart';

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
  late TaskDto _task;
  late TaskStatus _status;
  late final TabController _tabController;
  var _busy = false;

  @override
  void initState() {
    super.initState();
    _task = widget.initialTask;
    _status = widget.initialTask.status;
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _edit() async {
    final updated = await showEditTaskDialog(
      context: context,
      ref: ref,
      projectId: widget.projectId,
      task: _task,
    );
    if (updated != null && mounted) {
      setState(() {
        _task = updated;
        _status = updated.status;
      });
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(content: Text('Görev güncellendi.')));
    }
  }

  Future<void> _changeStatus(TaskStatus status) async {
    if (_busy || status == _status) return;
    setState(() {
      _busy = true;
      _status = status;
    });
    try {
      await ref.read(tasksProvider(widget.projectId).notifier).updateStatus(
            _task.id,
            status,
          );
      if (mounted) {
        setState(() => _task = _task.copyWith(status: status));
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(content: Text('Durum: ${status.label}')),
          );
      }
    } on TaskException catch (error) {
      setState(() => _status = _task.status);
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (_) {
      setState(() => _status = _task.status);
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
          .deleteTask(_task.id);
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
    final workspaceId = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace?.id),
    );
    final height = MediaQuery.sizeOf(context).height * 0.88;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    final scope = workspaceId == null
        ? null
        : TaskScope(workspaceId: workspaceId, taskId: _task.id);

    if (scope != null) {
      ref.watch(commentsProvider(scope));
      ref.watch(taskFilesProvider(scope));
      ref.watch(subtasksProvider(scope));
    }

    return SizedBox(
      height: height,
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 4, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _task.title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  PriorityBadge(priority: _task.priority),
                  IconButton(
                    tooltip: 'Düzenle',
                    onPressed: _busy ? null : _edit,
                    icon: const Icon(Icons.edit_outlined),
                  ),
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
              isScrollable: true,
              tabs: const [
                Tab(text: 'Detay'),
                Tab(text: 'Alt Görevler'),
                Tab(text: 'Yorumlar'),
                Tab(text: 'Dosyalar'),
              ],
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _DetailsTab(
                    task: _task,
                    assigneeLabel: _task.assigneeDisplayName(
                      ref.watch(workspaceMemberLabelMapProvider),
                    ),
                    status: _status,
                    busy: _busy,
                    onEdit: _edit,
                    onStatusSelected: _changeStatus,
                    onDelete: _delete,
                  ),
                  if (scope != null)
                    TaskSubtasksPanel(
                      scope: scope,
                      projectId: widget.projectId,
                    )
                  else
                    const Center(child: Text('Aktif çalışma alanı yok.')),
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
    required this.assigneeLabel,
    required this.status,
    required this.busy,
    required this.onEdit,
    required this.onStatusSelected,
    required this.onDelete,
  });

  final TaskDto task;
  final String assigneeLabel;
  final TaskStatus status;
  final bool busy;
  final VoidCallback onEdit;
  final ValueChanged<TaskStatus> onStatusSelected;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final dueLabel = task.dueDate == null
        ? 'Belirtilmedi'
        : DateFormat('dd.MM.yyyy').format(
            DateTime.tryParse(task.dueDate!)?.toLocal() ?? DateTime.now(),
          );

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: FilledButton.tonalIcon(
            onPressed: busy ? null : onEdit,
            icon: const Icon(Icons.edit_outlined),
            label: const Text('Düzenle'),
          ),
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
          subtitle: Text(assigneeLabel),
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.event_outlined),
          title: const Text('Teslim tarihi'),
          subtitle: Text(dueLabel),
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.flag_outlined),
          title: const Text('Öncelik'),
          subtitle: Text(task.priority.label),
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
