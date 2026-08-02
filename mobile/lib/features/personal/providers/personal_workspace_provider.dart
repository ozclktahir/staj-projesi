import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../data/personal_dto.dart';
import '../data/personal_repository.dart';

final personalRepositoryProvider = Provider<PersonalRepository>((ref) {
  return PersonalRepository(apiClient: ref.watch(apiClientProvider));
});

final personalNotesV2Provider =
    AsyncNotifierProvider.autoDispose<PersonalNotesV2Notifier, List<PersonalNoteDto>>(
  PersonalNotesV2Notifier.new,
);

class PersonalNotesV2Notifier
    extends AutoDisposeAsyncNotifier<List<PersonalNoteDto>> {
  @override
  Future<List<PersonalNoteDto>> build() async {
    return ref.read(personalRepositoryProvider).fetchNotes();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }

  Future<void> create({
    required String title,
    String? content,
    String? taskId,
  }) async {
    final created = await ref.read(personalRepositoryProvider).createNote(
          title: title,
          content: content,
          taskId: taskId,
        );
    final current = state.valueOrNull ?? const <PersonalNoteDto>[];
    state = AsyncData([created, ...current]);
  }

  Future<void> updateNote({
    required String noteId,
    String? title,
    String? content,
    String? taskId,
    bool? isCompleted,
    bool clearTaskId = false,
  }) async {
    final updated = await ref.read(personalRepositoryProvider).updateNote(
          noteId: noteId,
          title: title,
          content: content,
          taskId: taskId,
          isCompleted: isCompleted,
          clearTaskId: clearTaskId,
        );
    final current = state.valueOrNull ?? const <PersonalNoteDto>[];
    state = AsyncData([
      for (final n in current)
        if (n.id == noteId) updated else n,
    ]);
  }

  Future<void> remove(String noteId) async {
    await ref.read(personalRepositoryProvider).deleteNote(noteId);
    final current = state.valueOrNull ?? const <PersonalNoteDto>[];
    state = AsyncData([for (final n in current) if (n.id != noteId) n]);
  }
}

final personalTodosProvider =
    AsyncNotifierProvider.autoDispose<PersonalTodosNotifier, List<PersonalTodoDto>>(
  PersonalTodosNotifier.new,
);

class PersonalTodosNotifier
    extends AutoDisposeAsyncNotifier<List<PersonalTodoDto>> {
  @override
  Future<List<PersonalTodoDto>> build() async {
    return ref.read(personalRepositoryProvider).fetchTodos();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }

  Future<void> create({required String task, String? dueDate}) async {
    final created = await ref
        .read(personalRepositoryProvider)
        .createTodo(task: task, dueDate: dueDate);
    final current = state.valueOrNull ?? const <PersonalTodoDto>[];
    state = AsyncData([created, ...current]);
  }

  Future<void> toggle(String todoId, bool isCompleted) async {
    final updated = await ref.read(personalRepositoryProvider).updateTodo(
          todoId: todoId,
          isCompleted: isCompleted,
        );
    final current = state.valueOrNull ?? const <PersonalTodoDto>[];
    state = AsyncData([
      for (final t in current)
        if (t.id == todoId) updated else t,
    ]);
  }

  Future<void> remove(String todoId) async {
    await ref.read(personalRepositoryProvider).deleteTodo(todoId);
    final current = state.valueOrNull ?? const <PersonalTodoDto>[];
    state = AsyncData([for (final t in current) if (t.id != todoId) t]);
  }
}

final personalFilesProvider =
    AsyncNotifierProvider.autoDispose<PersonalFilesNotifier, List<PersonalFileDto>>(
  PersonalFilesNotifier.new,
);

class PersonalFilesNotifier
    extends AutoDisposeAsyncNotifier<List<PersonalFileDto>> {
  @override
  Future<List<PersonalFileDto>> build() async {
    return ref.read(personalRepositoryProvider).fetchFiles();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }

  Future<void> upload({
    required String filePath,
    required String fileName,
  }) async {
    final created = await ref.read(personalRepositoryProvider).uploadFile(
          filePath: filePath,
          fileName: fileName,
        );
    final current = state.valueOrNull ?? const <PersonalFileDto>[];
    state = AsyncData([created, ...current]);
  }

  Future<void> remove(String fileId) async {
    await ref.read(personalRepositoryProvider).deleteFile(fileId);
    final current = state.valueOrNull ?? const <PersonalFileDto>[];
    state = AsyncData([for (final f in current) if (f.id != fileId) f]);
  }
}
