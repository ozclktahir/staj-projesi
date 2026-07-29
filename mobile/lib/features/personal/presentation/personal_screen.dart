import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../tasks/data/task_dto.dart';
import '../../tasks/presentation/task_card.dart';
import '../../tasks/presentation/task_detail_sheet.dart';
import '../data/note_dto.dart';
import '../data/note_repository.dart';
import '../providers/personal_notes_provider.dart';
import '../providers/personal_tasks_provider.dart';

/// Kişisel alan: bana atanan görevler + kişisel notlar.
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
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Bana Atananlar'),
            Tab(text: 'Kişisel Notlar'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: const [
              _AssignedTasksTab(),
              _PersonalNotesTab(),
            ],
          ),
        ),
      ],
    );
  }
}

class _AssignedTasksTab extends ConsumerWidget {
  const _AssignedTasksTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userId = ref.watch(authProvider.select((s) => s.userId));
    final async = ref.watch(personalTasksProvider);

    if (userId == null || userId.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

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
                    ref.read(personalTasksProvider.notifier).refresh(),
                child: const Text('Tekrar dene'),
              ),
            ],
          ),
        ),
      ),
      data: (tasks) {
        if (tasks.isEmpty) {
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(personalTasksProvider.notifier).refresh(),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              children: const [
                SizedBox(height: 80),
                Icon(Icons.person_outline, size: 48),
                SizedBox(height: 16),
                Text(
                  'Size atanmış görev bulunmuyor.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => ref.read(personalTasksProvider.notifier).refresh(),
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(top: 8, bottom: 24),
            itemCount: tasks.length,
            itemBuilder: (context, index) {
              final task = tasks[index];
              return TaskCard(
                task: task,
                onTap: () => _openTask(context, ref, task),
              );
            },
          ),
        );
      },
    );
  }

  Future<void> _openTask(
    BuildContext context,
    WidgetRef ref,
    TaskDto task,
  ) async {
    final projectId = task.projectId;
    if (projectId == null || projectId.isEmpty) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(content: Text('Bu görevin proje bilgisi yok.')),
        );
      return;
    }
    await showTaskDetailSheet(
      context: context,
      ref: ref,
      projectId: projectId,
      task: task,
    );
    ref.invalidate(personalTasksProvider);
  }
}

class _PersonalNotesTab extends ConsumerStatefulWidget {
  const _PersonalNotesTab();

  @override
  ConsumerState<_PersonalNotesTab> createState() => _PersonalNotesTabState();
}

class _PersonalNotesTabState extends ConsumerState<_PersonalNotesTab> {
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  var _saving = false;

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _addNote() async {
    final title = _titleController.text.trim();
    if (title.isEmpty || _saving) return;

    setState(() => _saving = true);
    try {
      await ref.read(personalNotesProvider.notifier).addNote(
            title: title,
            content: _contentController.text,
          );
      _titleController.clear();
      _contentController.clear();
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(const SnackBar(content: Text('Not eklendi.')));
      }
    } on NoteException catch (error) {
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
            const SnackBar(content: Text('Not eklenemedi.')),
          );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(personalNotesProvider);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: Column(
            children: [
              TextField(
                controller: _titleController,
                enabled: !_saving,
                decoration: const InputDecoration(
                  labelText: 'Not başlığı',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _contentController,
                enabled: !_saving,
                minLines: 2,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'İçerik (opsiyonel)',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.icon(
                  onPressed: _saving ? null : _addNote,
                  icon: _saving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.add),
                  label: const Text('Ekle'),
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(error.toString(), textAlign: TextAlign.center),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: () =>
                          ref.read(personalNotesProvider.notifier).refresh(),
                      child: const Text('Tekrar dene'),
                    ),
                  ],
                ),
              ),
            ),
            data: (notes) {
              if (notes.isEmpty) {
                return const Center(child: Text('Henüz kişisel not yok.'));
              }
              return RefreshIndicator(
                onRefresh: () =>
                    ref.read(personalNotesProvider.notifier).refresh(),
                child: ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                  itemCount: notes.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final note = notes[index];
                    return _NoteTile(note: note);
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

class _NoteTile extends ConsumerWidget {
  const _NoteTile({required this.note});

  final NoteDto note;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.sticky_note_2_outlined),
        title: Text(note.title),
        subtitle: note.plainText.isEmpty
            ? null
            : Text(
                note.plainText,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
        trailing: IconButton(
          tooltip: 'Sil',
          onPressed: () async {
            try {
              await ref
                  .read(personalNotesProvider.notifier)
                  .deleteNote(note.id);
            } on NoteException catch (error) {
              if (context.mounted) {
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(SnackBar(content: Text(error.message)));
              }
            }
          },
          icon: const Icon(Icons.delete_outline),
        ),
      ),
    );
  }
}
