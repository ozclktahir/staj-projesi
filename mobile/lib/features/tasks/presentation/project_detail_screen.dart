import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/app_strings.dart';
import '../../activity/presentation/activity_log_panel.dart';
import '../../workspace/data/project_dto.dart';
import '../../workspace/data/project_repository.dart';
import '../../workspace/providers/project_provider.dart';
import '../../workspace/providers/workspace_capabilities_provider.dart';
import '../data/task_dto.dart';
import '../data/task_repository.dart';
import '../providers/kanban_filter_provider.dart';
import '../providers/task_provider.dart';
import 'create_task_dialog.dart';
import 'task_actions.dart';
import 'task_card.dart';
import 'task_detail_sheet.dart';

/// Proje detay — sekmeli Kanban (TODO / IN_PROGRESS / DONE) + Aktivite.
class ProjectDetailScreen extends ConsumerStatefulWidget {
  const ProjectDetailScreen({
    super.key,
    required this.projectId,
    this.projectName,
  });

  final String projectId;
  final String? projectName;

  @override
  ConsumerState<ProjectDetailScreen> createState() =>
      _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends ConsumerState<ProjectDetailScreen> {
  late final TextEditingController _searchController;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(
      text: ref.read(kanbanFilterProvider(widget.projectId)).search,
    );
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      ref
          .read(kanbanFilterProvider(widget.projectId).notifier)
          .setSearch(value);
    });
  }

  Future<void> _confirmDeleteProject() async {
    final s = ref.read(appStringsProvider);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(s.projectDelete),
        content: Text(
          '"${widget.projectName ?? 'Bu proje'}" arşivlenecek. Devam etmek istiyor musunuz?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(s.commonCancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(s.commonDelete),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      await ref
          .read(projectsProvider.notifier)
          .deleteProject(widget.projectId);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(content: Text('Proje silindi.')));
      Navigator.of(context).pop();
    } on ProjectException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(error.message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(content: Text('Proje silinemedi.')),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(appStringsProvider);
    final filter = ref.watch(kanbanFilterProvider(widget.projectId));
    final caps = ref.watch(workspaceCapabilitiesProvider);

    return DefaultTabController(
      length: TaskStatus.values.length + 1,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.projectName ?? 'Proje'),
          actions: [
            if (caps.canDeleteProject)
              PopupMenuButton<String>(
                onSelected: (value) {
                  if (value == 'delete') _confirmDeleteProject();
                },
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'delete',
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.delete_outline),
                      title: Text(s.projectDelete),
                    ),
                  ),
                ],
              ),
          ],
          bottom: TabBar(
            isScrollable: true,
            tabs: [
              for (final status in TaskStatus.values)
                Tab(text: status.localizedLabel(s)),
              Tab(text: s.projectActivity),
            ],
          ),
        ),
        floatingActionButton: caps.canCreateTask
            ? FloatingActionButton(
                tooltip: 'Yeni görev',
                onPressed: () async {
                  final created = await showCreateTaskDialog(
                    context: context,
                    ref: ref,
                    projectId: widget.projectId,
                  );
                  if (created == true && context.mounted) {
                    ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        SnackBar(content: Text(s.projectTaskCreated)),
                      );
                  }
                },
                child: const Icon(Icons.add),
              )
            : null,
        body: Column(
          children: [
            _KanbanToolbar(
              searchController: _searchController,
              selectedPriority: filter.priority,
              selectedSort: filter.sort,
              onSearchChanged: _onSearchChanged,
              onPrioritySelected: (priority) {
                ref
                    .read(kanbanFilterProvider(widget.projectId).notifier)
                    .setPriority(priority);
              },
              onSortSelected: (sort) {
                ref
                    .read(kanbanFilterProvider(widget.projectId).notifier)
                    .setSort(sort);
              },
              onClearSearch: () {
                _searchController.clear();
                ref
                    .read(kanbanFilterProvider(widget.projectId).notifier)
                    .setSearch('');
              },
            ),
            Expanded(
              child: TabBarView(
                children: [
                  for (final status in TaskStatus.values)
                    _StatusColumnBody(
                      projectId: widget.projectId,
                      status: status,
                      sort: filter.sort,
                    ),
                  ActivityLogPanel(projectId: widget.projectId),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KanbanToolbar extends StatelessWidget {
  const _KanbanToolbar({
    required this.searchController,
    required this.selectedPriority,
    required this.selectedSort,
    required this.onSearchChanged,
    required this.onPrioritySelected,
    required this.onSortSelected,
    required this.onClearSearch,
  });

  final TextEditingController searchController;
  final TaskPriority? selectedPriority;
  final KanbanSort selectedSort;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<TaskPriority?> onPrioritySelected;
  final ValueChanged<KanbanSort> onSortSelected;
  final VoidCallback onClearSearch;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ListenableBuilder(
              listenable: searchController,
              builder: (context, _) {
                return TextField(
                  controller: searchController,
                  onChanged: onSearchChanged,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Görev ara…',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: searchController.text.isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Temizle',
                            onPressed: onClearSearch,
                            icon: const Icon(Icons.clear),
                          ),
                    isDense: true,
                    border: const OutlineInputBorder(),
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                PopupMenuButton<String>(
                  tooltip: 'Filtre',
                  onSelected: (value) {
                    if (value == 'all') {
                      onPrioritySelected(null);
                      return;
                    }
                    for (final priority in TaskPriority.values) {
                      if (priority.name == value) {
                        onPrioritySelected(priority);
                        return;
                      }
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem<String>(
                      value: 'all',
                      child: Row(
                        children: [
                          if (selectedPriority == null)
                            Icon(
                              Icons.check,
                              size: 16,
                              color: Theme.of(context).colorScheme.primary,
                            )
                          else
                            const SizedBox(width: 16),
                          const SizedBox(width: 8),
                          const Text('Tümü'),
                        ],
                      ),
                    ),
                    for (final priority in TaskPriority.values)
                      PopupMenuItem<String>(
                        value: priority.name,
                        child: Row(
                          children: [
                            if (selectedPriority == priority)
                              Icon(
                                Icons.check,
                                size: 16,
                                color: Theme.of(context).colorScheme.primary,
                              )
                            else
                              const SizedBox(width: 16),
                            const SizedBox(width: 8),
                            Text(priority.label),
                          ],
                        ),
                      ),
                  ],
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 6,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.filter_list,
                          size: 18,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Filtre',
                          style: Theme.of(context)
                              .textTheme
                              .labelMedium
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        if (selectedPriority != null) ...[
                          const SizedBox(width: 4),
                          Icon(
                            Icons.circle,
                            size: 8,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                PopupMenuButton<KanbanSort>(
                  tooltip: 'Sıralama',
                  initialValue: selectedSort,
                  onSelected: onSortSelected,
                  itemBuilder: (context) => [
                    for (final sort in KanbanSort.values)
                      PopupMenuItem(
                        value: sort,
                        child: Row(
                          children: [
                            if (sort == selectedSort)
                              Icon(
                                Icons.check,
                                size: 16,
                                color: Theme.of(context).colorScheme.primary,
                              )
                            else
                              const SizedBox(width: 16),
                            const SizedBox(width: 8),
                            Flexible(child: Text(sort.label)),
                          ],
                        ),
                      ),
                  ],
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 6,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.sort,
                          size: 18,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Sıra',
                          style:
                              Theme.of(context).textTheme.labelMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusColumnBody extends ConsumerWidget {
  const _StatusColumnBody({
    required this.projectId,
    required this.status,
    required this.sort,
  });

  final String projectId;
  final TaskStatus status;
  final KanbanSort sort;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(tasksProvider(projectId));

    return tasksAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(error.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () =>
                    ref.read(tasksProvider(projectId).notifier).refresh(),
                child: const Text('Tekrar dene'),
              ),
            ],
          ),
        ),
      ),
      data: (state) {
        final column = state.items
            .where((task) => task.status == status)
            .toList();
        return _TaskColumn(
          projectId: projectId,
          status: status,
          tasks: applyKanbanSort(column, sort),
          hasMore: state.hasMore,
          isLoadingMore: state.isLoadingMore,
        );
      },
    );
  }
}

class _TaskColumn extends ConsumerWidget {
  const _TaskColumn({
    required this.projectId,
    required this.status,
    required this.tasks,
    required this.hasMore,
    required this.isLoadingMore,
  });

  final String projectId;
  final TaskStatus status;
  final List<TaskDto> tasks;
  final bool hasMore;
  final bool isLoadingMore;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(appStringsProvider);
    Future<void> onRefresh() =>
        ref.read(tasksProvider(projectId).notifier).refresh();

    Future<void> acceptDrop(TaskDto task) async {
      if (task.status == status) return;
      try {
        await ref
            .read(tasksProvider(projectId).notifier)
            .updateStatus(task.id, status);
      } catch (e) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    }

    Widget listBody({required bool highlighted}) {
      if (tasks.isEmpty && !isLoadingMore) {
        return ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 80),
            Icon(
              Icons.inbox_outlined,
              size: 48,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'Bu sütunda henüz görev yok',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            if (hasMore) ...[
              const SizedBox(height: 16),
              Center(
                child: TextButton(
                  onPressed: () =>
                      ref.read(tasksProvider(projectId).notifier).loadMore(),
                  child: Text(s.projectLoadMore),
                ),
              ),
            ],
          ],
        );
      }

      final itemCount = tasks.length + (hasMore || isLoadingMore ? 1 : 0);
      return NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          if (notification.metrics.pixels >=
                  notification.metrics.maxScrollExtent - 120 &&
              hasMore &&
              !isLoadingMore) {
            ref.read(tasksProvider(projectId).notifier).loadMore();
          }
          return false;
        },
        child: ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(top: 8, bottom: 88),
          itemCount: itemCount,
          itemBuilder: (context, index) {
            if (index >= tasks.length) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: isLoadingMore
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : TextButton(
                          onPressed: () => ref
                              .read(tasksProvider(projectId).notifier)
                              .loadMore(),
                          child: Text(s.projectLoadMore),
                        ),
                ),
              );
            }
            final task = tasks[index];
            Future<void> handleStatus() async {
              final next = await showTaskStatusPicker(
                context: context,
                current: task.status,
              );
              if (next == null || !context.mounted) return;
              try {
                await applyTaskStatusChange(
                  ref: ref,
                  task: task,
                  projectId: projectId,
                  status: next,
                );
              } on TaskException catch (e) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(SnackBar(content: Text(e.message)));
              } catch (_) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(
                    const SnackBar(content: Text('Durum güncellenemedi.')),
                  );
              }
            }

            Future<void> handleDelete() async {
              try {
                final message = await confirmAndRequestTaskDeletion(
                  context: context,
                  ref: ref,
                  task: task,
                  projectId: projectId,
                );
                if (message == null || !context.mounted) return;
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(SnackBar(content: Text(message)));
              } on TaskException catch (e) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(SnackBar(content: Text(e.message)));
              } catch (_) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(
                    const SnackBar(content: Text('Silme isteği gönderilemedi.')),
                  );
              }
            }

            return LongPressDraggable<TaskDto>(
              data: task,
              feedback: Material(
                elevation: 6,
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: MediaQuery.sizeOf(context).width * 0.85,
                  child: Opacity(
                    opacity: 0.9,
                    child: TaskCard(task: task, onTap: () {}),
                  ),
                ),
              ),
              childWhenDragging: Opacity(
                opacity: 0.35,
                child: TaskCard(task: task, onTap: () {}),
              ),
              child: TaskCard(
                task: task,
                onTap: () => showTaskDetailSheet(
                  context: context,
                  ref: ref,
                  projectId: projectId,
                  task: task,
                ),
                onStatusChange: handleStatus,
                onDelete: handleDelete,
              ),
            );
          },
        ),
      );
    }

    return DragTarget<TaskDto>(
      onWillAcceptWithDetails: (details) => details.data.status != status,
      onAcceptWithDetails: (details) => acceptDrop(details.data),
      builder: (context, candidate, rejected) {
        final highlighted = candidate.isNotEmpty;
        return DecoratedBox(
          decoration: BoxDecoration(
            color: highlighted
                ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.08)
                : null,
            borderRadius: BorderRadius.circular(8),
          ),
          child: RefreshIndicator(
            onRefresh: onRefresh,
            child: listBody(highlighted: highlighted),
          ),
        );
      },
    );
  }
}

/// Router `extra` ile gelen proje bilgisini çözümler.
ProjectDto? projectFromExtra(Object? extra) {
  if (extra is ProjectDto) return extra;
  return null;
}
