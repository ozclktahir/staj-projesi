import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/network/workspace_presence_provider.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../activity/data/activity_log_dto.dart';
import '../../activity/providers/activity_log_provider.dart';
import '../../tasks/data/task_dto.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../providers/dashboard_models.dart';
import '../providers/dashboard_provider.dart';

const _workloadColors = <Color>[
  Color(0xFF8B5CF6),
  Color(0xFFF59E0B),
  Color(0xFF10B981),
  Color(0xFFEC4899),
  Color(0xFF3B82F6),
  Color(0xFFEF4444),
];

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(appStringsProvider);
    final hasWorkspace = ref.watch(
      workspaceProvider.select((ws) => ws.activeWorkspace != null),
    );
    if (!hasWorkspace) {
      return AppEmptyState(
        icon: Icons.dashboard_outlined,
        title: s.dashboardNoWorkspace,
        subtitle: 'Özet metrikleri görmek için bir çalışma alanı seçin.',
      );
    }

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
                child: Text(s.commonRetry),
              ),
            ],
          ),
        ),
      ),
      data: (data) => RefreshIndicator(
        onRefresh: () async {
          await Future.wait([
            ref.read(dashboardProvider.notifier).refresh(),
            ref.read(activityLogProvider(null).notifier).refresh(),
          ]);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Text(
              'Workspace Komuta Merkezi',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'Tüm projelerin özet metrikleri, grafikler ve son hareketler.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 16),
            _KpiGrid(
              data: data,
              totalTasksLabel: s.dashboardTotalTasks,
              completionRateLabel: s.dashboardCompletionRate,
              overdueLabel: s.dashboardOverdueTasks,
              activeMembersLabel: s.dashboardActiveMembers,
              activeMembersHint: ref.watch(
                workspacePresenceProvider.select((p) => p.ready),
              )
                  ? 'Şu anda çevrimiçi'
                  : null,
            ),
            const SizedBox(height: 20),
            Text(
              'Grafikler',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 10),
            _StatusPieChart(data: data, title: s.dashboardStatusDist),
            const SizedBox(height: 12),
            _PriorityBarChart(
              slices: data.byPriority,
              title: s.dashboardPriorityDensity,
            ),
            const SizedBox(height: 12),
            _WorkloadBarChart(
              workload: data.workload,
              title: s.dashboardMemberLoad,
            ),
            const SizedBox(height: 20),
            Text(
              'Yaklaşan görevler',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            _UpcomingList(deadlines: data.upcomingDeadlines),
            const SizedBox(height: 20),
            const _QuickActivityFeed(),
          ],
        ),
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({
    required this.data,
    required this.totalTasksLabel,
    required this.completionRateLabel,
    required this.overdueLabel,
    required this.activeMembersLabel,
    this.activeMembersHint,
  });

  final DashboardData data;
  final String totalTasksLabel;
  final String completionRateLabel;
  final String overdueLabel;
  final String activeMembersLabel;
  final String? activeMembersHint;

  @override
  Widget build(BuildContext context) {
    final rate = data.completionRate == data.completionRate.roundToDouble()
        ? '${data.completionRate.toInt()}'
        : data.completionRate.toStringAsFixed(1);

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.95,
      children: [
        _KpiCard(
          label: totalTasksLabel,
          value: '${data.totalTasks}',
          icon: Icons.assignment_outlined,
          accent: const Color(0xFF6366F1),
        ),
        _KpiCard(
          label: completionRateLabel,
          value: '%$rate',
          icon: Icons.check_circle_outline,
          accent: const Color(0xFF10B981),
        ),
        _KpiCard(
          label: overdueLabel,
          value: '${data.overdueTasks}',
          icon: Icons.warning_amber_outlined,
          accent: const Color(0xFFF43F5E),
        ),
        _KpiCard(
          label: activeMembersLabel,
          value: '${data.activeMembers}',
          icon: Icons.group_outlined,
          accent: const Color(0xFFF59E0B),
          hint: activeMembersHint,
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
    required this.accent,
    this.hint,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color accent;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: accent.withValues(alpha: 0.45), width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: accent, size: 16),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                          fontSize: 11,
                          height: 1.1,
                        ),
                  ),
                  Flexible(
                    child: Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            height: 1.15,
                          ),
                    ),
                  ),
                  if (hint != null)
                    Text(
                      hint!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: accent,
                            fontSize: 9,
                            height: 1.1,
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

class _ChartCardShell extends StatelessWidget {
  const _ChartCardShell({
    required this.title,
    required this.subtitle,
    required this.child,
    this.footer,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontSize: 11,
                  ),
            ),
            const SizedBox(height: 8),
            child,
            if (footer != null) ...[
              const SizedBox(height: 8),
              Align(alignment: Alignment.center, child: footer!),
            ],
          ],
        ),
      ),
    );
  }
}

class _EmptyChartHint extends StatelessWidget {
  const _EmptyChartHint();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: 200,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: scheme.outlineVariant,
                width: 3,
                strokeAlign: BorderSide.strokeAlignInside,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Henüz veri yok',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
          ),
        ],
      ),
    );
  }
}

class _ColorBadges extends StatelessWidget {
  const _ColorBadges({required this.items});

  final List<({String label, Color color, int count})> items;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 6,
      alignment: WrapAlignment.center,
      children: [
        for (final item in items)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
              color: Theme.of(context).colorScheme.surfaceContainerHighest
                  .withValues(alpha: 0.45),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: item.color,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  item.label,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(width: 4),
                Text(
                  '${item.count}',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _StatusPieChart extends StatelessWidget {
  const _StatusPieChart({required this.data, required this.title});

  final DashboardData data;
  final String title;

  @override
  Widget build(BuildContext context) {
    final slices = <({String label, int count, Color color})>[
      (
        label: TaskStatus.todo.label,
        count: data.todoTasks,
        color: const Color(0xFFF59E0B),
      ),
      (
        label: TaskStatus.inProgress.label,
        count: data.inProgressTasks,
        color: const Color(0xFF6366F1),
      ),
      (
        label: TaskStatus.done.label,
        count: data.completedTasks,
        color: const Color(0xFF10B981),
      ),
    ];
    final total = slices.fold<int>(0, (sum, s) => sum + s.count);

    return _ChartCardShell(
      title: title,
      subtitle: 'Yapılacak · Devam ediyor · Tamamlandı',
      footer: total == 0
          ? null
          : _ColorBadges(
              items: [
                for (final s in slices)
                  (label: s.label, color: s.color, count: s.count),
              ],
            ),
      child: total == 0
          ? const _EmptyChartHint()
          : SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  pieTouchData: PieTouchData(enabled: false),
                  sectionsSpace: 3,
                  centerSpaceRadius: 48,
                  sections: [
                    for (final slice in slices)
                      if (slice.count > 0)
                        PieChartSectionData(
                          value: slice.count.toDouble(),
                          title: '',
                          color: slice.color,
                          radius: 52,
                        ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _PriorityBarChart extends StatelessWidget {
  const _PriorityBarChart({required this.slices, required this.title});

  final List<DashboardChartSlice> slices;
  final String title;

  static const _palette = <String, Color>{
    'HIGH': Color(0xFFF43F5E),
    'MEDIUM': Color(0xFFF59E0B),
    'LOW': Color(0xFF64748B),
  };

  @override
  Widget build(BuildContext context) {
    final hasData = slices.any((s) => s.count > 0);
    final scheme = Theme.of(context).colorScheme;
    final maxY = slices.fold<int>(0, (m, s) => s.count > m ? s.count : m);

    return _ChartCardShell(
      title: title,
      subtitle: 'HIGH · MEDIUM · LOW',
      footer: !hasData
          ? null
          : _ColorBadges(
              items: [
                for (final s in slices)
                  (
                    label: s.label,
                    color: _palette[s.key] ?? scheme.primary,
                    count: s.count,
                  ),
              ],
            ),
      child: !hasData
          ? const _EmptyChartHint()
          : SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  maxY: (maxY + 1).toDouble(),
                  alignment: BarChartAlignment.spaceAround,
                  barTouchData: const BarTouchData(enabled: false),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: 1,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: scheme.outlineVariant.withValues(alpha: 0.6),
                      strokeWidth: 1,
                      dashArray: const [4, 4],
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  titlesData: FlTitlesData(
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        interval: 1,
                        getTitlesWidget: (value, meta) {
                          if (value != value.roundToDouble()) {
                            return const SizedBox.shrink();
                          }
                          return Text(
                            '${value.toInt()}',
                            style: TextStyle(
                              fontSize: 10,
                              color: scheme.onSurfaceVariant,
                            ),
                          );
                        },
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final i = value.toInt();
                          if (i < 0 || i >= slices.length) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              slices[i].label,
                              style: TextStyle(
                                fontSize: 11,
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  barGroups: [
                    for (var i = 0; i < slices.length; i++)
                      BarChartGroupData(
                        x: i,
                        barRods: [
                          BarChartRodData(
                            toY: slices[i].count.toDouble(),
                            width: 28,
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(4),
                            ),
                            color: _palette[slices[i].key] ?? scheme.primary,
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _WorkloadBarChart extends StatelessWidget {
  const _WorkloadBarChart({required this.workload, required this.title});

  final List<DashboardWorkloadItem> workload;
  final String title;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final items = workload.take(8).toList();
    final maxY = items.fold<int>(0, (m, s) => s.total > m ? s.total : m);

    return _ChartCardShell(
      title: title,
      subtitle: 'Üye başına atanan görev sayısı',
      footer: items.isEmpty
          ? null
          : _ColorBadges(
              items: [
                for (var i = 0; i < items.length; i++)
                  (
                    label: items[i].name,
                    color: _workloadColors[i % _workloadColors.length],
                    count: items[i].total,
                  ),
              ],
            ),
      child: items.isEmpty
          ? const _EmptyChartHint()
          : SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  maxY: (maxY + 1).toDouble(),
                  alignment: BarChartAlignment.spaceAround,
                  barTouchData: const BarTouchData(enabled: false),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: 1,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: scheme.outlineVariant.withValues(alpha: 0.6),
                      strokeWidth: 1,
                      dashArray: const [4, 4],
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  titlesData: FlTitlesData(
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        interval: 1,
                        getTitlesWidget: (value, meta) {
                          if (value != value.roundToDouble()) {
                            return const SizedBox.shrink();
                          }
                          return Text(
                            '${value.toInt()}',
                            style: TextStyle(
                              fontSize: 10,
                              color: scheme.onSurfaceVariant,
                            ),
                          );
                        },
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final i = value.toInt();
                          if (i < 0 || i >= items.length) {
                            return const SizedBox.shrink();
                          }
                          final name = items[i].name;
                          final short =
                              name.length > 8 ? '${name.substring(0, 7)}…' : name;
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              short,
                              style: TextStyle(
                                fontSize: 10,
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  barGroups: [
                    for (var i = 0; i < items.length; i++)
                      BarChartGroupData(
                        x: i,
                        barRods: [
                          BarChartRodData(
                            toY: items[i].total.toDouble(),
                            width: 22,
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(4),
                            ),
                            color: _workloadColors[i % _workloadColors.length],
                          ),
                        ],
                      ),
                  ],
                ),
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
      return Card(
        elevation: 0,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
          child: Column(
            children: [
              Icon(
                Icons.event_available_outlined,
                size: 36,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 8),
              Text(
                'Yaklaşan teslim tarihi yok',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        ),
      );
    }

    final formatter = DateFormat('dd.MM.yyyy');

    return Column(
      children: [
        for (final task in deadlines)
          Card(
            elevation: 0,
            child: ListTile(
              leading: Icon(
                Icons.event_outlined,
                color: Theme.of(context).colorScheme.primary,
              ),
              title: Text(
                task.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
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

class _QuickActivityFeed extends ConsumerWidget {
  const _QuickActivityFeed();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(appStringsProvider);
    final async = ref.watch(activityLogProvider(null));
    final scheme = Theme.of(context).colorScheme;

    return Card(
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.history, size: 18, color: scheme.primary),
                const SizedBox(width: 8),
                Text(
                  s.dashboardRecentActivity,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              'Workspace genelindeki en son kullanıcı hareketleri',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontSize: 11,
                  ),
            ),
            const SizedBox(height: 12),
            async.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
              ),
              error: (_, _) => Text(
                'Aktiviteler yüklenemedi.',
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              data: (logs) {
                final recent = logs.take(8).toList();
                if (recent.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        'Henüz aktivite yok.',
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      ),
                    ),
                  );
                }
                return Column(
                  children: [
                    for (final log in recent) ...[
                      _ActivityRow(log: log),
                      if (log != recent.last) const SizedBox(height: 8),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.log});

  final ActivityLogDto log;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.8)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: scheme.primary.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.person_outline, size: 16, color: scheme.primary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  log.formatMessage(AppStrings.of(context)),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 2),
                Text(
                  _relativeTime(log.createdAt),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontSize: 10,
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

String _relativeTime(String? raw) {
  if (raw == null || raw.isEmpty) return '';
  final dt = DateTime.tryParse(raw)?.toLocal();
  if (dt == null) return '';
  final diff = DateTime.now().difference(dt);
  if (diff.inSeconds < 60) return 'Az önce';
  if (diff.inMinutes < 60) return '${diff.inMinutes} dk önce';
  if (diff.inHours < 24) return '${diff.inHours} saat önce';
  if (diff.inDays < 7) return '${diff.inDays} gün önce';
  return DateFormat('dd.MM.yyyy').format(dt);
}
