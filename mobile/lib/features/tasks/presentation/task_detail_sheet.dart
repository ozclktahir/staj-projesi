import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../personal/providers/personal_tasks_provider.dart';
import '../../workspace/providers/workspace_members_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../data/task_scope.dart';
import '../data/update_task_dto.dart';
import '../../activity/presentation/activity_log_panel.dart';
import '../../workspace/data/workspace_member_dto.dart';
import '../../workspace/providers/workspace_capabilities_provider.dart';
import '../providers/comment_provider.dart';
import '../providers/file_provider.dart';
import '../providers/subtask_provider.dart';
import '../providers/task_assignees_provider.dart';
import '../providers/task_provider.dart';
import 'edit_task_dialog.dart';
import 'task_actions.dart';
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
    useSafeArea: true,
    builder: (sheetContext) {
      return Material(
        color: Theme.of(sheetContext).colorScheme.surface,
        child: _TaskDetailSheetBody(
          projectId: projectId,
          initialTask: task,
        ),
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
  var _loadingDetails = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _task = widget.initialTask;
    _status = widget.initialTask.status;
    _tabController = TabController(length: 5, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadTaskDetails());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadTaskDetails() async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id ??
        widget.initialTask.workspaceId;
    if (workspaceId == null || workspaceId.isEmpty) {
      if (mounted) {
        setState(() {
          _loadingDetails = false;
          _loadError = 'Aktif çalışma alanı yok.';
        });
      }
      return;
    }

    try {
      final fresh = await ref.read(taskRepositoryProvider).getTaskDetails(
            workspaceId: workspaceId,
            taskId: widget.initialTask.id,
          );
      if (!mounted) return;
      setState(() {
        _task = fresh;
        _status = fresh.status;
        _loadingDetails = false;
        _loadError = null;
      });
    } on TaskException catch (error) {
      if (!mounted) return;
      setState(() {
        _loadingDetails = false;
        _loadError = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingDetails = false;
        // Liste kartındaki veri ile devam et.
        _loadError = null;
      });
    }
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
    if (!_task.canChangeStatus) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text(
              'Sahiplenme onayı bekleyen görevin durumu değiştirilemez.',
            ),
          ),
        );
      return;
    }
    setState(() {
      _busy = true;
      _status = status;
    });
    try {
      final workspaceId =
          ref.read(workspaceProvider).activeWorkspace?.id ??
              _task.workspaceId;
      if (workspaceId == null || workspaceId.isEmpty) {
        throw TaskException('Workspace seçilmedi.');
      }

      if (widget.projectId.isNotEmpty) {
        await ref.read(tasksProvider(widget.projectId).notifier).updateStatus(
              _task.id,
              status,
            );
      } else {
        final updated = await ref.read(taskRepositoryProvider).updateTask(
              workspaceId: workspaceId,
              taskId: _task.id,
              dto: UpdateTaskDto(status: status),
            );
        if (mounted) setState(() => _task = updated);
        ref.invalidate(personalTasksProvider);
      }
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
    setState(() => _busy = true);
    try {
      final message = await confirmAndRequestTaskDeletion(
        context: context,
        ref: ref,
        task: _task,
        projectId: widget.projectId,
      );
      if (!mounted || message == null) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(message)));

      if (widget.projectId.isNotEmpty) {
        await ref.read(tasksProvider(widget.projectId).notifier).refresh();
        if (!mounted) return;
        final items =
            ref.read(tasksProvider(widget.projectId)).valueOrNull?.items ??
                const <TaskDto>[];
        final updated = items.where((t) => t.id == _task.id).toList();
        if (updated.isEmpty) {
          Navigator.of(context).pop();
        } else {
          setState(() => _task = updated.first);
        }
      } else {
        // Dual approval: görev listede kalır, silinmedi.
        setState(() {
          _task = _task.copyWith(deletionStatus: 'pending_admin_approval');
        });
      }
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
            const SnackBar(content: Text('Silme isteği gönderilemedi.')),
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

    final scopeWorkspaceId = workspaceId ?? _task.workspaceId;
    final scope = (scopeWorkspaceId == null || scopeWorkspaceId.isEmpty)
        ? null
        : TaskScope(workspaceId: scopeWorkspaceId, taskId: _task.id);

    if (scope != null) {
      ref.watch(commentsProvider(scope));
      ref.watch(taskFilesProvider(scope));
      ref.watch(subtasksProvider(scope));
    }

    if (_loadingDetails) {
      return SizedBox(
        height: height * 0.4,
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_loadError != null && _task.id.isEmpty) {
      return SizedBox(
        height: height * 0.4,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_loadError!, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () {
                    setState(() => _loadingDetails = true);
                    _loadTaskDetails();
                  },
                  child: const Text('Yeniden dene'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: height,
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_loadError != null)
              MaterialBanner(
                content: Text(_loadError!),
                actions: [
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _loadingDetails = true;
                        _loadError = null;
                      });
                      _loadTaskDetails();
                    },
                    child: const Text('Yenile'),
                  ),
                ],
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 4, 4),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _task.title.isEmpty ? 'Görev' : _task.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
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
              labelStyle: const TextStyle(fontWeight: FontWeight.w600),
              tabs: const [
                Tab(text: 'Detay'),
                Tab(text: 'Alt Görevler'),
                Tab(text: 'Yorumlar'),
                Tab(text: 'Dosyalar'),
                Tab(text: 'Aktivite'),
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
                    scope: scope,
                    onEdit: _edit,
                    onStatusSelected: _changeStatus,
                    onDelete: _delete,
                  ),
                  scope != null
                      ? TaskSubtasksPanel(
                          scope: scope,
                          projectId: widget.projectId,
                        )
                      : const Center(child: Text('Aktif çalışma alanı yok.')),
                  scope != null
                      ? TaskCommentsPanel(scope: scope)
                      : const Center(child: Text('Aktif çalışma alanı yok.')),
                  scope != null
                      ? TaskFilesPanel(scope: scope)
                      : const Center(child: Text('Aktif çalışma alanı yok.')),
                  ActivityLogPanel(
                    projectId:
                        widget.projectId.isEmpty ? null : widget.projectId,
                    taskId: _task.id,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailsTab extends ConsumerWidget {
  const _DetailsTab({
    required this.task,
    required this.assigneeLabel,
    required this.status,
    required this.busy,
    required this.scope,
    required this.onEdit,
    required this.onStatusSelected,
    required this.onDelete,
  });

  final TaskDto task;
  final String assigneeLabel;
  final TaskStatus status;
  final bool busy;
  final TaskScope? scope;
  final VoidCallback onEdit;
  final ValueChanged<TaskStatus> onStatusSelected;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final dueLabel = task.dueDate == null
        ? 'Belirtilmedi'
        : DateFormat('dd.MM.yyyy').format(
            DateTime.tryParse(task.dueDate!)?.toLocal() ?? DateTime.now(),
          );

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        Row(
          children: [
            Text(
              'Detay',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const Spacer(),
            OutlinedButton.icon(
              onPressed: busy ? null : onEdit,
              icon: const Icon(Icons.edit_outlined, size: 16),
              label: const Text('Düzenle'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _FieldLabel(text: 'Açıklama'),
        const SizedBox(height: 6),
        Text(
          (task.description != null && task.description!.trim().isNotEmpty)
              ? task.description!
              : 'Açıklama yok.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: (task.description != null &&
                        task.description!.trim().isNotEmpty)
                    ? null
                    : scheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 20),
        _FieldLabel(text: 'Atanan'),
        const SizedBox(height: 6),
        Text(assigneeLabel, style: Theme.of(context).textTheme.bodyMedium),
        if (scope != null) ...[
          const SizedBox(height: 16),
          _ExtraAssigneesSection(scope: scope!),
        ],
        const SizedBox(height: 16),
        _FieldLabel(text: 'Teslim tarihi'),
        const SizedBox(height: 6),
        Text(dueLabel, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 16),
        _FieldLabel(text: 'Öncelik'),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: PriorityBadge(priority: task.priority),
        ),
        if (task.isClaimPending) ...[
          const SizedBox(height: 16),
          _InfoBanner(
            icon: Icons.hourglass_top,
            color: task.isClaimOverdue
                ? Colors.red
                : Colors.amber,
            title: task.isClaimOverdue
                ? 'Sahiplenme süresi aşıldı'
                : 'Sahiplenme onayı bekleniyor',
            subtitle:
                'Atanan kullanıcı kabul edene kadar durum değiştirilemez.',
          ),
        ],
        if (task.isDeletionPending) ...[
          const SizedBox(height: 12),
          const _InfoBanner(
            icon: Icons.delete_forever_outlined,
            color: Colors.orange,
            title: 'Silme onayı bekleniyor',
            subtitle: 'Karşı taraf onaylayana kadar görev silinmez.',
          ),
        ],
        const SizedBox(height: 20),
        Text(
          'Durum',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<TaskStatus>(
          // ignore: deprecated_member_use
          value: status,
          decoration: const InputDecoration(
            labelText: 'Görev durumu',
            border: OutlineInputBorder(),
            helperText: 'Menüden yeni durumu seçin',
          ),
          items: [
            for (final value in TaskStatus.values)
              DropdownMenuItem(
                value: value,
                child: Text(value.label),
              ),
          ],
          onChanged: (busy || !task.canChangeStatus)
              ? null
              : (value) {
                  if (value != null) onStatusSelected(value);
                },
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: (busy || !task.canChangeStatus)
              ? null
              : () async {
                  final selected = await showTaskStatusPicker(
                    context: context,
                    current: status,
                  );
                  if (selected != null) onStatusSelected(selected);
                },
          icon: const Icon(Icons.expand_more),
          label: const Text('Durumu değiştir'),
        ),
        const SizedBox(height: 28),
        Row(
          children: [
            if (busy)
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            const Spacer(),
            FilledButton.tonalIcon(
              style: FilledButton.styleFrom(
                foregroundColor: scheme.error,
              ),
              onPressed: (busy || task.isDeletionPending) ? null : onDelete,
              icon: const Icon(Icons.delete_outline),
              label: Text(
                task.isDeletionPending ? 'Onay bekleniyor' : 'Silme onayı iste',
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// "Ek Atananlar" (task_assignees) — birincil "Atanan"a ek katman.
/// Admin: düzenlenebilir çoklu seçim. Diğerleri: salt okunur rozet listesi.
class _ExtraAssigneesSection extends ConsumerWidget {
  const _ExtraAssigneesSection({required this.scope});

  final TaskScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assigneesAsync = ref.watch(taskAssigneesProvider(scope));
    final isAdmin = ref.watch(workspaceCapabilitiesProvider).isAdmin;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _FieldLabel(text: 'Ek Atananlar'),
            const Spacer(),
            if (isAdmin)
              TextButton.icon(
                onPressed: () => _editExtraAssignees(context, ref),
                icon: const Icon(Icons.group_add_outlined, size: 16),
                label: const Text('Düzenle'),
              ),
          ],
        ),
        const SizedBox(height: 6),
        assigneesAsync.when(
          loading: () => const SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          error: (error, _) => Text(
            'Yüklenemedi.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.error,
                ),
          ),
          data: (assignees) {
            if (assignees.isEmpty) {
              return Text(
                'Ek atanan yok.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              );
            }
            return Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final assignee in assignees)
                  Chip(
                    avatar: CircleAvatar(
                      backgroundColor: Theme.of(context)
                          .colorScheme
                          .primary
                          .withValues(alpha: 0.15),
                      foregroundColor: Theme.of(context).colorScheme.primary,
                      child: Text(
                        assignee.displayName.isNotEmpty
                            ? assignee.displayName[0].toUpperCase()
                            : '?',
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                    label: Text(assignee.displayName),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _editExtraAssignees(BuildContext context, WidgetRef ref) async {
    final members =
        ref.read(workspaceMembersProvider).valueOrNull ?? const <WorkspaceMemberDto>[];
    final current = ref.read(taskAssigneesProvider(scope)).valueOrNull ??
        const <TaskAssigneeOption>[];
    final selected = {for (final a in current) a.id};

    final result = await showDialog<Set<String>>(
      context: context,
      builder: (dialogContext) {
        var localSelected = {...selected};
        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: const Text('Ek atananlar'),
              content: SizedBox(
                width: double.maxFinite,
                child: members.isEmpty
                    ? const Text('Çalışma alanında üye yok.')
                    : ListView(
                        shrinkWrap: true,
                        children: [
                          for (final member in members)
                            CheckboxListTile(
                              value: localSelected.contains(member.id),
                              title: Text(member.label),
                              onChanged: (checked) {
                                setLocal(() {
                                  if (checked == true) {
                                    localSelected.add(member.id);
                                  } else {
                                    localSelected.remove(member.id);
                                  }
                                });
                              },
                            ),
                        ],
                      ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('İptal'),
                ),
                FilledButton(
                  onPressed: () =>
                      Navigator.of(dialogContext).pop(localSelected),
                  child: const Text('Kaydet'),
                ),
              ],
            );
          },
        );
      },
    );

    if (result == null || !context.mounted) return;

    try {
      await ref
          .read(taskAssigneesProvider(scope).notifier)
          .setAssignees(result.toList());
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text('Kaydedilemedi: $error')));
    }
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.2,
          ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final MaterialColor color;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color.shade800),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: color.shade900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: color.shade800,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
