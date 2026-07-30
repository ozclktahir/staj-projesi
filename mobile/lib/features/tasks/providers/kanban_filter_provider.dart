import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/task_dto.dart';

/// Web Kanban kolon sıralaması ile uyumlu.
enum KanbanSort {
  priorityDesc,
  priorityAsc,
  dateNewest,
  dateOldest;

  String get label {
    switch (this) {
      case KanbanSort.priorityDesc:
        return 'Öncelik: Yüksek → Düşük';
      case KanbanSort.priorityAsc:
        return 'Öncelik: Düşük → Yüksek';
      case KanbanSort.dateNewest:
        return 'Tarih: En Yeni';
      case KanbanSort.dateOldest:
        return 'Tarih: En Eski';
    }
  }
}

/// Kanban arama / öncelik filtresi / sıralama (null priority = ALL).
class KanbanFilter {
  const KanbanFilter({
    this.search = '',
    this.priority,
    this.sort = KanbanSort.priorityDesc,
  });

  final String search;
  final TaskPriority? priority;
  final KanbanSort sort;

  KanbanFilter copyWith({
    String? search,
    TaskPriority? priority,
    KanbanSort? sort,
    bool clearPriority = false,
  }) {
    return KanbanFilter(
      search: search ?? this.search,
      priority: clearPriority ? null : (priority ?? this.priority),
      sort: sort ?? this.sort,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is KanbanFilter &&
        other.search == search &&
        other.priority == priority &&
        other.sort == sort;
  }

  @override
  int get hashCode => Object.hash(search, priority, sort);
}

List<TaskDto> applyKanbanSort(List<TaskDto> tasks, KanbanSort sort) {
  final sorted = [...tasks];
  int dateMs(TaskDto t) {
    final raw = t.createdAt;
    if (raw == null || raw.isEmpty) return 0;
    return DateTime.tryParse(raw)?.millisecondsSinceEpoch ?? 0;
  }

  sorted.sort((a, b) {
    switch (sort) {
      case KanbanSort.priorityAsc:
        return a.priority.weight.compareTo(b.priority.weight);
      case KanbanSort.dateNewest:
        return dateMs(b).compareTo(dateMs(a));
      case KanbanSort.dateOldest:
        return dateMs(a).compareTo(dateMs(b));
      case KanbanSort.priorityDesc:
        return b.priority.weight.compareTo(a.priority.weight);
    }
  });
  return sorted;
}

class KanbanFilterNotifier
    extends AutoDisposeFamilyNotifier<KanbanFilter, String> {
  @override
  KanbanFilter build(String projectId) => const KanbanFilter();

  void setSearch(String value) {
    state = state.copyWith(search: value.trim());
  }

  void setPriority(TaskPriority? priority) {
    if (priority == null) {
      state = state.copyWith(clearPriority: true);
    } else {
      state = state.copyWith(priority: priority);
    }
  }

  void setSort(KanbanSort sort) {
    state = state.copyWith(sort: sort);
  }
}

final kanbanFilterProvider = NotifierProvider.autoDispose
    .family<KanbanFilterNotifier, KanbanFilter, String>(
  KanbanFilterNotifier.new,
);
