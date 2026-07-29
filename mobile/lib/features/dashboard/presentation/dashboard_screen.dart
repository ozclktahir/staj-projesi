import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../tasks/data/task_dto.dart';
import '../providers/dashboard_models.dart';
import '../providers/dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dashboardProvider);

    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(error.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () =>
                    ref.read(dashboardProvider.notifier).refresh(),
                child: const Text('Tekrar dene'),
              ),
            ],
          ),
        ),
      ),
      data: (data) => RefreshIndicator(
        onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Text(
              'Özet',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            _KpiGrid(data: data),
            const SizedBox(height: 24),
            Text(
              'Görev durumları',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            _StatusPieChart(data: data),
            const SizedBox(height: 24),
            Text(
              'Yaklaşan görevler',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            _UpcomingList(deadlines: data.upcomingDeadlines),
          ],
        ),
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.data});

  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.55,
      children: [
        _KpiCard(
          label: 'Toplam Görev',
          value: '${data.totalTasks}',
          icon: Icons.assignment_outlined,
          color: Theme.of(context).colorScheme.primary,
        ),
        _KpiCard(
          label: 'Tamamlanan',
          value: '${data.completedTasks}',
          icon: Icons.check_circle_outline,
          color: Colors.green.shade700,
        ),
        _KpiCard(
          label: 'Devam Eden',
          value: '${data.inProgressTasks}',
          icon: Icons.timelapse,
          color: Colors.orange.shade800,
        ),
        _KpiCard(
          label: 'Geciken',
          value: '${data.overdueTasks}',
          icon: Icons.warning_amber_outlined,
          color: Colors.red.shade700,
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: color.withValues(alpha: 0.08),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const Spacer(),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusPieChart extends StatelessWidget {
  const _StatusPieChart({required this.data});

  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    final slices = <({String label, int count, Color color})>[
      (
        label: TaskStatus.todo.label,
        count: data.todoTasks,
        color: const Color(0xFF6366F1),
      ),
      (
        label: TaskStatus.inProgress.label,
        count: data.inProgressTasks,
        color: const Color(0xFFF59E0B),
      ),
      (
        label: TaskStatus.done.label,
        count: data.completedTasks,
        color: const Color(0xFF10B981),
      ),
    ];
    final total = slices.fold<int>(0, (sum, s) => sum + s.count);

    if (total == 0) {
      return const Card(
        child: SizedBox(
          height: 180,
          child: Center(child: Text('Grafik için görev bulunamadı.')),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sectionsSpace: 2,
                  centerSpaceRadius: 36,
                  sections: [
                    for (final slice in slices)
                      if (slice.count > 0)
                        PieChartSectionData(
                          value: slice.count.toDouble(),
                          title:
                              '${((slice.count / total) * 100).round()}%',
                          color: slice.color,
                          radius: 58,
                          titleStyle: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                for (final slice in slices)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: slice.color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text('${slice.label} (${slice.count})'),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _UpcomingList extends StatelessWidget {
  const _UpcomingList({required this.deadlines});

  final List<TaskDto> deadlines;

  @override
  Widget build(BuildContext context) {
    if (deadlines.isEmpty) {
      return const Card(
        child: ListTile(
          leading: Icon(Icons.event_available_outlined),
          title: Text('Yaklaşan teslim tarihi yok'),
        ),
      );
    }

    final formatter = DateFormat('dd.MM.yyyy');

    return Column(
      children: [
        for (final task in deadlines)
          Card(
            child: ListTile(
              leading: Icon(
                Icons.event_outlined,
                color: Theme.of(context).colorScheme.primary,
              ),
              title: Text(task.title),
              subtitle: Text(
                [
                  task.priority.label,
                  if (task.dueDate != null)
                    formatter.format(
                      DateTime.tryParse(task.dueDate!)?.toLocal() ??
                          DateTime.now(),
                    ),
                ].join(' · '),
              ),
              trailing: Text(
                task.status.label,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ),
      ],
    );
  }
}
