import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../workspace/data/project_dto.dart';
import '../data/task_dto.dart';
import '../providers/task_provider.dart';
import 'create_task_dialog.dart';
import 'task_card.dart';
import 'task_detail_sheet.dart';

/// Proje detay — sekmeli Kanban (TODO / IN_PROGRESS / DONE).
class ProjectDetailScreen extends ConsumerWidget {
  const ProjectDetailScreen({
    super.key,
    required this.projectId,
    this.projectName,
  });

  final String projectId;
  final String? projectName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(tasksProvider(projectId));

    return DefaultTabController(
      length: TaskStatus.values.length,
      child: Scaffold(
        appBar: AppBar(
          title: Text(projectName ?? 'Proje'),
          bottom: TabBar(
            isScrollable: true,
            tabs: [
              for (final status in TaskStatus.values)
                Tab(text: status.label),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton(
          tooltip: 'Yeni görev',
          onPressed: () async {
            final created = await showCreateTaskDialog(
              context: context,
              ref: ref,
              projectId: projectId,
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
        ),
        body: tasksAsync.when(
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
          data: (tasks) {
            return TabBarView(
              children: [
                for (final status in TaskStatus.values)
                  _TaskColumn(
                    projectId: projectId,
                    tasks: tasks
                        .where((task) => task.status == status)
                        .toList(),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _TaskColumn extends ConsumerWidget {
  const _TaskColumn({
    required this.projectId,
    required this.tasks,
  });

  final String projectId;
  final List<TaskDto> tasks;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> onRefresh() =>
        ref.read(tasksProvider(projectId).notifier).refresh();

    if (tasks.isEmpty) {
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
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(top: 8, bottom: 88),
        itemCount: tasks.length,
        itemBuilder: (context, index) {
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
    );
  }
}

/// Router `extra` ile gelen proje bilgisini çözümler.
ProjectDto? projectFromExtra(Object? extra) {
  if (extra is ProjectDto) return extra;
  return null;
}
