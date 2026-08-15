import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/search_hit_dto.dart';
import 'workspace_provider.dart';

/// Global arama sonuçları — kullanıcı yazdıkça `search()` çağrılır
/// (ekran tarafında debounce ediliyor).
class GlobalSearchNotifier extends AutoDisposeAsyncNotifier<List<SearchHitDto>> {
  @override
  Future<List<SearchHitDto>> build() async => const [];

  Future<void> search(String query) async {
    final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
    final q = query.trim();
    if (workspaceId == null || q.isEmpty) {
      state = const AsyncData([]);
      return;
    }
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(workspaceRepositoryProvider).search(
            workspaceId: workspaceId,
            query: q,
          ),
    );
  }

  void clear() {
    state = const AsyncData([]);
  }
}

final globalSearchProvider =
    AsyncNotifierProvider.autoDispose<GlobalSearchNotifier, List<SearchHitDto>>(
  GlobalSearchNotifier.new,
);
