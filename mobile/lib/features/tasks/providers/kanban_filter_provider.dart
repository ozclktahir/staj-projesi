import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/task_dto.dart';

/// Kanban arama / öncelik filtresi (null priority = ALL).
class KanbanFilter {
  const KanbanFilter({
    this.search = '',
    this.priority,
  });

  final String search;
  final TaskPriority? priority;

  KanbanFilter copyWith({
    String? search,
    TaskPriority? priority,
    bool clearPriority = false,
  }) {
    return KanbanFilter(
      search: search ?? this.search,
      priority: clearPriority ? null : (priority ?? this.priority),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is KanbanFilter &&
        other.search == search &&
        other.priority == priority;
  }

  @override
  int get hashCode => Object.hash(search, priority);
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
}

final kanbanFilterProvider = NotifierProvider.autoDispose
    .family<KanbanFilterNotifier, KanbanFilter, String>(
  KanbanFilterNotifier.new,
);
