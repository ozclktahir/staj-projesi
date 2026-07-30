import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../activity/presentation/activity_log_panel.dart';
import '../../workspace/data/project_dto.dart';
import '../../workspace/data/project_repository.dart';
import '../../workspace/providers/project_provider.dart';
import '../../workspace/providers/workspace_capabilities_provider.dart';
import '../data/task_dto.dart';
import '../providers/kanban_filter_provider.dart';
import '../providers/task_provider.dart';
import 'create_task_dialog.dart';
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
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Projeyi sil'),
        content: Text(
          '"${widget.projectName ?? 'Bu proje'}" arşivlenecek. Devam etmek istiyor musunuz?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('İptal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Sil'),
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
                itemBuilder: (context) => const [
                  PopupMenuItem(
                    value: 'delete',
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(Icons.delete_outline),
                      title: Text('Projeyi Sil'),
                    ),
                  ),
                ],
              ),
          ],
          bottom: TabBar(
            isScrollable: true,
            tabs: [
              for (final status in TaskStatus.values)
                Tab(text: status.label),
              const Tab(text: 'Aktivite'),
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
                        const SnackBar(content: Text('Görev oluşturuldu.')),
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
              onSearchChanged: _onSearchChanged,
              onPrioritySelected: (priority) {
                ref
                    .read(kanbanFilterProvider(widget.projectId).notifier)
                    .setPriority(priority);
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
    required this.onSearchChanged,
    required this.onPrioritySelected,
    required this.onClearSearch,
  });

  final TextEditingController searchController;
  final TaskPriority? selectedPriority;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<TaskPriority?> onPrioritySelected;
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
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _PriorityChip(
                    label: 'ALL',
                    selected: selectedPriority == null,
                    onSelected: () => onPrioritySelected(null),
                  ),
                  for (final priority in TaskPriority.values)
                    Padding(
                      padding: const EdgeInsets.only(left: 6),
                      child: _PriorityChip(
                        label: priority.apiValue,
                        selected: selectedPriority == priority,
                        onSelected: () => onPrioritySelected(priority),
                      ),
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

class _PriorityChip extends StatelessWidget {
  const _PriorityChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onSelected(),
      showCheckmark: false,
      visualDensity: VisualDensity.compact,
    );
  }
}

class _StatusColumnBody extends ConsumerWidget {
  const _StatusColumnBody({
    required this.projectId,
    required this.status,
  });

  final String projectId;
  final TaskStatus status;

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
      data: (state) => _TaskColumn(
        projectId: projectId,
        tasks: state.items.where((task) => task.status == status).toList(),
        hasMore: state.hasMore,
        isLoadingMore: state.isLoadingMore,
      ),
    );
  }
}

class _TaskColumn extends ConsumerWidget {
  const _TaskColumn({
    required this.projectId,
    required this.tasks,
    required this.hasMore,
    required this.isLoadingMore,
  });

  final String projectId;
  final List<TaskDto> tasks;
  final bool hasMore;
  final bool isLoadingMore;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> onRefresh() =>
        ref.read(tasksProvider(projectId).notifier).refresh();

    if (tasks.isEmpty && !isLoadingMore) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
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
                  child: const Text('Daha fazla yükle'),
                ),
              ),
            ],
          ],
        ),
      );
    }

    final itemCount = tasks.length + (hasMore || isLoadingMore ? 1 : 0);

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: NotificationListener<ScrollNotification>(
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
                          child: const Text('Daha fazla yükle'),
                        ),
                ),
              );
            }
            final task = tasks[index];
            return TaskCard(
              task: task,
              onTap: () => showTaskDetailSheet(
                context: context,
                ref: ref,
                projectId: projectId,
                task: task,
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Router `extra` ile gelen proje bilgisini çözümler.
ProjectDto? projectFromExtra(Object? extra) {
  if (extra is ProjectDto) return extra;
  return null;
}
