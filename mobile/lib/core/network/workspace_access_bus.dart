import 'dart:async';

/// Dio 403 → UI/state temizliği için hafif event bus (Riverpod döngüsü yok).
class WorkspaceAccessBus {
  WorkspaceAccessBus._();
  static final WorkspaceAccessBus instance = WorkspaceAccessBus._();

  final _controller = StreamController<String?>.broadcast();

  Stream<String?> get stream => _controller.stream;

  void notifyForbidden(String? workspaceId) {
    if (!_controller.isClosed) {
      _controller.add(workspaceId);
    }
  }
}
