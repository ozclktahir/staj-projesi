import 'dart:async';

/// Dio 401 → oturum temizliği için event bus (Riverpod döngüsü yok).
class AuthSessionBus {
  AuthSessionBus._();
  static final AuthSessionBus instance = AuthSessionBus._();

  final _controller = StreamController<void>.broadcast();

  Stream<void> get stream => _controller.stream;

  void notifyUnauthorized() {
    if (!_controller.isClosed) {
      _controller.add(null);
    }
  }
}
