import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/constants/upload_limits.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../auth/providers/auth_provider.dart';
import '../../tasks/data/task_dto.dart';
import '../../tasks/presentation/task_card.dart';
import '../../tasks/presentation/task_detail_sheet.dart';
import '../data/personal_dto.dart';
import '../data/personal_repository.dart';
import '../providers/personal_tasks_provider.dart';
import '../providers/personal_workspace_provider.dart';

/// Kişisel alan — web `/personal` 4 sekme parity.
class PersonalScreen extends ConsumerStatefulWidget {
  const PersonalScreen({super.key});

  @override
  ConsumerState<PersonalScreen> createState() => _PersonalScreenState();
}

class _PersonalScreenState extends ConsumerState<PersonalScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(appStringsProvider);
    return Column(
      children: [
        TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: [
            Tab(text: s.personalTabAssigned),
            Tab(text: s.personalTabNotes),
            Tab(text: s.personalTabTodos),
            Tab(text: s.personalTabFiles),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: const [
              _AssignedTasksTab(),
              _NotesTab(),
              _TodosTab(),
              _FilesTab(),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Assigned + filters ─────────────────────────────────────────────────────

class _AssignedTasksTab extends ConsumerStatefulWidget {
  const _AssignedTasksTab();

  @override
  ConsumerState<_AssignedTasksTab> createState() => _AssignedTasksTabState();
}

class _AssignedTasksTabState extends ConsumerState<_AssignedTasksTab> {
  final _search = TextEditingController();
  TaskPriority? _priority;
  TaskStatus? _status;
  String _dateFilter = 'all'; // all | hasDue | noDue | overdue

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<TaskDto> _apply(List<TaskDto> items) {
    final q = _search.text.trim().toLowerCase();
    final now = DateTime.now();
    return [
      for (final task in items)
        if ((q.isEmpty || task.title.toLowerCase().contains(q)) &&
            (_priority == null || task.priority == _priority) &&
            (_status == null || task.status == _status) &&
            !_rejected(task) &&
            _matchDate(task, now))
          task,
    ];
  }

  bool _rejected(TaskDto task) => task.assignmentStatus.isRejected;

  bool _matchDate(TaskDto task, DateTime now) {
    final due = task.dueDate != null ? DateTime.tryParse(task.dueDate!) : null;
    switch (_dateFilter) {
      case 'hasDue':
        return due != null;
      case 'noDue':
        return due == null;
      case 'overdue':
        return due != null && due.isBefore(now) && !task.isDone;
      default:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(appStringsProvider);
    final userId = ref.watch(authProvider.select((auth) => auth.userId));
    final async = ref.watch(personalTasksProvider);

    if (userId == null || userId.isEmpty) {
      return const AppEmptyState(
        icon: Icons.person_off_outlined,
        title: 'Kullanıcı bulunamadı',
        subtitle: 'Lütfen tekrar giriş yapın.',
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 4, 4),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _search,
                  decoration: InputDecoration(
                    hintText: s.personalSearchTasks,
                    prefixIcon: const Icon(Icons.search),
                    isDense: true,
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              PopupMenuButton<String>(
                tooltip: 'Filtre',
                icon: Badge(
                  isLabelVisible: _priority != null ||
                      _status != null ||
                      _dateFilter != 'all',
                  child: const Icon(Icons.filter_list),
                ),
                onSelected: (value) {
                  setState(() {
                    if (value.startsWith('p:')) {
                      final key = value.substring(2);
                      _priority = key == 'all'
                          ? null
                          : TaskPriority.values.cast<TaskPriority?>().firstWhere(
                                (e) => e?.name == key,
                                orElse: () => null,
                              );
                    } else if (value.startsWith('s:')) {
                      final key = value.substring(2);
                      _status = key == 'all'
                          ? null
                          : TaskStatus.values.cast<TaskStatus?>().firstWhere(
                                (e) => e?.name == key,
                                orElse: () => null,
                              );
                    } else if (value.startsWith('d:')) {
                      _dateFilter = value.substring(2);
                    } else if (value == 'clear') {
                      _priority = null;
                      _status = null;
                      _dateFilter = 'all';
                    }
                  });
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    enabled: false,
                    child: Text('Öncelik',
                        style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  PopupMenuItem(
                    value: 'p:all',
                    child: Text(_priority == null ? '✓ Tümü' : 'Tümü'),
                  ),
                  for (final p in TaskPriority.values)
                    PopupMenuItem(
                      value: 'p:${p.name}',
                      child: Text(
                        _priority == p ? '✓ ${p.label}' : p.label,
                      ),
                    ),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    enabled: false,
                    child: Text('Durum',
                        style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  PopupMenuItem(
                    value: 's:all',
                    child: Text(_status == null ? '✓ Tümü' : 'Tümü'),
                  ),
                  for (final st in TaskStatus.values)
                    PopupMenuItem(
                      value: 's:${st.name}',
                      child: Text(
                        _status == st ? '✓ ${st.label}' : st.label,
                      ),
                    ),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    enabled: false,
                    child: Text('Tarih',
                        style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  for (final entry in const [
                    ('all', 'Tümü'),
                    ('hasDue', 'Tarihli'),
                    ('noDue', 'Tarihsiz'),
                    ('overdue', 'Geciken'),
                  ])
                    PopupMenuItem(
                      value: 'd:${entry.$1}',
                      child: Text(
                        _dateFilter == entry.$1
                            ? '✓ ${entry.$2}'
                            : entry.$2,
                      ),
                    ),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    value: 'clear',
                    child: Text('Filtreleri temizle'),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => AppEmptyState(
              icon: Icons.error_outline,
              title: 'Görevler yüklenemedi',
              subtitle: e.toString(),
              action: FilledButton(
                onPressed: () =>
                    ref.read(personalTasksProvider.notifier).refresh(),
                child: const Text('Tekrar dene'),
              ),
            ),
            data: (items) {
              final filtered = _apply(items);
              if (filtered.isEmpty) {
                return const AppEmptyState(
                  icon: Icons.inbox_outlined,
                  title: 'Atanan görev yok',
                  subtitle: 'Filtrelere uyan görev bulunamadı.',
                );
              }
              return RefreshIndicator(
                onRefresh: () =>
                    ref.read(personalTasksProvider.notifier).refresh(),
                child: ListView.builder(
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final task = filtered[index];
                    return TaskCard(
                      task: task,
                      onTap: () => showTaskDetailSheet(
                        context: context,
                        ref: ref,
                        projectId: task.projectId ?? '',
                        task: task,
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ─── Notes ──────────────────────────────────────────────────────────────────

class _NotesTab extends ConsumerWidget {
  const _NotesTab();

  Future<void> _edit(
    BuildContext context,
    WidgetRef ref, {
    PersonalNoteDto? existing,
  }) async {
    final s = ref.read(appStringsProvider);
    final title = TextEditingController(text: existing?.title ?? '');
    final content = TextEditingController(text: existing?.content ?? '');
    String? selectedTaskId = existing?.taskId;
    final tasks = ref.read(personalTasksProvider).valueOrNull ?? const <TaskDto>[];
    try {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) {
          return StatefulBuilder(
            builder: (context, setLocal) {
              return AlertDialog(
                title: Text(existing == null ? 'Yeni not' : 'Notu düzenle'),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextField(
                        controller: title,
                        decoration: InputDecoration(labelText: s.personalTitle),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: content,
                        maxLines: 5,
                        decoration: const InputDecoration(labelText: 'İçerik'),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String?>(
                        // ignore: deprecated_member_use
                        value: selectedTaskId,
                        decoration: const InputDecoration(
                          labelText: 'İlgili Görev',
                          prefixIcon: Icon(Icons.assignment_outlined),
                        ),
                        items: [
                          const DropdownMenuItem<String?>(
                            value: null,
                            child: Text('Görev seçilmedi'),
                          ),
                          for (final task in tasks)
                            DropdownMenuItem<String?>(
                              value: task.id,
                              child: Text(
                                task.title,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                        ],
                        onChanged: (value) =>
                            setLocal(() => selectedTaskId = value),
                      ),
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('İptal'),
                  ),
                  FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Kaydet'),
                  ),
                ],
              );
            },
          );
        },
      );
      if (ok != true) return;
      if (existing == null) {
        await ref.read(personalNotesV2Provider.notifier).create(
              title: title.text,
              content: content.text,
              taskId: selectedTaskId,
            );
      } else {
        final clearTask = selectedTaskId == null && existing.taskId != null;
        await ref.read(personalNotesV2Provider.notifier).updateNote(
              noteId: existing.id,
              title: title.text,
              content: content.text,
              taskId: selectedTaskId,
              clearTaskId: clearTask,
            );
      }
    } on PersonalException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      title.dispose();
      content.dispose();
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(appStringsProvider);
    final async = ref.watch(personalNotesV2Provider);
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        heroTag: 'personal-note-fab',
        onPressed: () => _edit(context, ref),
        child: const Icon(Icons.add),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppEmptyState(
          icon: Icons.error_outline,
          title: 'Notlar yüklenemedi',
          subtitle: e.toString(),
          action: FilledButton(
            onPressed: () =>
                ref.read(personalNotesV2Provider.notifier).refresh(),
            child: const Text('Tekrar dene'),
          ),
        ),
        data: (notes) {
          if (notes.isEmpty) {
            return const AppEmptyState(
              icon: Icons.note_alt_outlined,
              title: 'Henüz not yok',
              subtitle: 'Kişisel notlarınızı burada tutabilirsiniz.',
            );
          }
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(personalNotesV2Provider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 88),
              itemCount: notes.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final note = notes[index];
                final linked = note.taskTitle?.trim();
                return Card(
                  child: ListTile(
                    leading: Icon(
                      note.isCompleted
                          ? Icons.check_circle
                          : Icons.note_outlined,
                      color: note.isCompleted
                          ? Colors.green
                          : Theme.of(context).colorScheme.primary,
                    ),
                    title: Text(
                      note.title,
                      style: TextStyle(
                        decoration: note.isCompleted
                            ? TextDecoration.lineThrough
                            : null,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          note.content.isEmpty ? 'İçerik yok' : note.content,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (linked != null && linked.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Görev: $linked',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .primary,
                                ),
                          ),
                        ] else if (note.taskId != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Göreve bağlı',
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .primary,
                                ),
                          ),
                        ],
                      ],
                    ),
                    isThreeLine: note.taskId != null,
                    trailing: PopupMenuButton<String>(
                      onSelected: (value) async {
                        try {
                          if (value == 'edit') {
                            await _edit(context, ref, existing: note);
                          } else if (value == 'toggle') {
                            await ref
                                .read(personalNotesV2Provider.notifier)
                                .updateNote(
                                  noteId: note.id,
                                  isCompleted: !note.isCompleted,
                                );
                          } else if (value == 'delete') {
                            await ref
                                .read(personalNotesV2Provider.notifier)
                                .remove(note.id);
                          }
                        } on PersonalException catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(e.message)),
                            );
                          }
                        }
                      },
                      itemBuilder: (_) => [
                        PopupMenuItem(value: 'edit', child: Text(s.personalEdit)),
                        const PopupMenuItem(
                          value: 'toggle',
                          child: Text('Tamamlandı işaretle'),
                        ),
                        const PopupMenuItem(value: 'delete', child: Text('Sil')),
                      ],
                    ),
                    onTap: () => _edit(context, ref, existing: note),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

// ─── Todos ──────────────────────────────────────────────────────────────────

class _TodosTab extends ConsumerWidget {
  const _TodosTab();

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final taskCtrl = TextEditingController();
    DateTime? due;
    try {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) {
          return StatefulBuilder(
            builder: (context, setLocal) {
              return AlertDialog(
                title: const Text('Yeni todo'),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: taskCtrl,
                      decoration: const InputDecoration(labelText: 'Görev'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: due ?? DateTime.now(),
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2100),
                        );
                        if (picked != null) setLocal(() => due = picked);
                      },
                      icon: const Icon(Icons.event),
                      label: Text(
                        due == null
                            ? 'Bitiş tarihi (opsiyonel)'
                            : DateFormat('dd.MM.yyyy').format(due!),
                      ),
                    ),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('İptal'),
                  ),
                  FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Ekle'),
                  ),
                ],
              );
            },
          );
        },
      );
      if (ok != true || taskCtrl.text.trim().isEmpty) return;
      await ref.read(personalTodosProvider.notifier).create(
            task: taskCtrl.text.trim(),
            dueDate: due != null
                ? DateFormat('yyyy-MM-dd').format(due!)
                : null,
          );
    } on PersonalException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      taskCtrl.dispose();
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(personalTodosProvider);
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        heroTag: 'personal-todo-fab',
        onPressed: () => _add(context, ref),
        child: const Icon(Icons.add),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppEmptyState(
          icon: Icons.error_outline,
          title: 'Todos yüklenemedi',
          subtitle: e.toString(),
        ),
        data: (todos) {
          if (todos.isEmpty) {
            return const AppEmptyState(
              icon: Icons.checklist_outlined,
              title: 'Todo yok',
              subtitle: 'Kişisel yapılacaklar listenizi oluşturun.',
            );
          }
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(personalTodosProvider.notifier).refresh(),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 88),
              itemCount: todos.length,
              itemBuilder: (context, index) {
                final todo = todos[index];
                return CheckboxListTile(
                  value: todo.isCompleted,
                  title: Text(
                    todo.task,
                    style: TextStyle(
                      decoration: todo.isCompleted
                          ? TextDecoration.lineThrough
                          : null,
                    ),
                  ),
                  subtitle: todo.dueDate != null
                      ? Text('Bitiş: ${todo.dueDate}')
                      : null,
                  secondary: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () async {
                      try {
                        await ref
                            .read(personalTodosProvider.notifier)
                            .remove(todo.id);
                      } on PersonalException catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(e.message)),
                          );
                        }
                      }
                    },
                  ),
                  onChanged: (value) async {
                    try {
                      await ref
                          .read(personalTodosProvider.notifier)
                          .toggle(todo.id, value ?? false);
                    } on PersonalException catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(e.message)),
                        );
                      }
                    }
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}

// ─── Files ──────────────────────────────────────────────────────────────────

class _FilesTab extends ConsumerWidget {
  const _FilesTab();

  Future<void> _upload(BuildContext context, WidgetRef ref) async {
    final s = ref.read(appStringsProvider);
    final result = await FilePicker.platform.pickFiles();
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    if (file.path == null) return;
    if (file.size > UploadLimits.maxFileBytes) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Dosya çok büyük (${UploadLimits.formatBytes(file.size)}). '
              'En fazla ${UploadLimits.formatBytes(UploadLimits.maxFileBytes)} yükleyebilirsiniz.',
            ),
          ),
        );
      }
      return;
    }
    try {
      await ref.read(personalFilesProvider.notifier).upload(
            filePath: file.path!,
            fileName: file.name,
          );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(s.personalFileUploaded)),
        );
      }
    } on PersonalException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(personalFilesProvider);
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        heroTag: 'personal-file-fab',
        onPressed: () => _upload(context, ref),
        child: const Icon(Icons.upload_file),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppEmptyState(
          icon: Icons.error_outline,
          title: 'Dosyalar yüklenemedi',
          subtitle: e.toString(),
        ),
        data: (files) {
          if (files.isEmpty) {
            return const AppEmptyState(
              icon: Icons.folder_open_outlined,
              title: 'Dosya yok',
              subtitle: 'Kişisel dosyalarınızı buraya yükleyin.',
            );
          }
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(personalFilesProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 88),
              itemCount: files.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final file = files[index];
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.insert_drive_file_outlined),
                    title: Text(file.fileName),
                    subtitle: file.fileSize != null
                        ? Text('${(file.fileSize! / 1024).toStringAsFixed(1)} KB')
                        : null,
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () async {
                        try {
                          await ref
                              .read(personalFilesProvider.notifier)
                              .remove(file.id);
                        } on PersonalException catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(e.message)),
                            );
                          }
                        }
                      },
                    ),
                    onTap: () async {
                      final uri = Uri.tryParse(file.fileUrl);
                      if (uri != null) {
                        await launchUrl(
                          uri,
                          mode: LaunchMode.externalApplication,
                        );
                      }
                    },
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
