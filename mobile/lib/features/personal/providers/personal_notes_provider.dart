import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../workspace/providers/workspace_provider.dart';
import '../data/note_dto.dart';
import '../data/note_repository.dart';

final noteRepositoryProvider = Provider<NoteRepository>((ref) {
  return NoteRepository(apiClient: ref.watch(apiClientProvider));
});

final personalNotesProvider =
    AsyncNotifierProvider.autoDispose<PersonalNotesNotifier, List<NoteDto>>(
  PersonalNotesNotifier.new,
);

class PersonalNotesNotifier extends AutoDisposeAsyncNotifier<List<NoteDto>> {
  @override
  Future<List<NoteDto>> build() async {
    final workspaceId = ref.watch(
      workspaceProvider.select((s) => s.activeWorkspace?.id),
    );
    if (workspaceId == null) return const [];
    try {
      return await ref.read(noteRepositoryProvider).fetchNotes(workspaceId);
    } catch (error) {
      return const [];
    }
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }

  Future<void> addNote({
    required String title,
    String? content,
  }) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return;

    final created = await ref.read(noteRepositoryProvider).createNote(
          workspaceId: workspaceId,
          dto: CreateNoteDto(title: title, plainContent: content),
        );
    final current = state.valueOrNull ?? const <NoteDto>[];
    state = AsyncData([created, ...current]);
  }

  Future<void> deleteNote(String noteId) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    if (workspaceId == null) return;

    final previous = state.valueOrNull ?? const <NoteDto>[];
    state = AsyncData([
      for (final note in previous)
        if (note.id != noteId) note,
    ]);

    try {
      await ref.read(noteRepositoryProvider).deleteNote(
            workspaceId: workspaceId,
            noteId: noteId,
          );
    } catch (_) {
      state = AsyncData(previous);
      rethrow;
    }
  }
}
