import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/task_repository.dart';
import '../data/task_scope.dart';
import '../providers/subtask_provider.dart';

class TaskSubtasksPanel extends ConsumerStatefulWidget {
  const TaskSubtasksPanel({
    super.key,
    required this.scope,
    this.projectId,
  });

  final TaskScope scope;
  final String? projectId;

  @override
  ConsumerState<TaskSubtasksPanel> createState() => _TaskSubtasksPanelState();
}

class _TaskSubtasksPanelState extends ConsumerState<TaskSubtasksPanel> {
  final _controller = TextEditingController();
  var _adding = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final title = _controller.text.trim();
    if (title.isEmpty || _adding) return;
    setState(() => _adding = true);
    try {
      await ref.read(subtasksProvider(widget.scope).notifier).addSubtask(
            title: title,
            projectId: widget.projectId,
          );
      _controller.clear();
    } on TaskException catch (error) {
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
            const SnackBar(content: Text('Alt görev eklenemedi.')),
          );
      }
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(subtasksProvider(widget.scope));

    return Column(
      children: [
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
                      onPressed: () => ref
                          .read(subtasksProvider(widget.scope).notifier)
                          .refresh(),
                      child: const Text('Tekrar dene'),
                    ),
                  ],
                ),
              ),
            ),
            data: (subtasks) {
              if (subtasks.isEmpty) {
                return const Center(
                  child: Text('Henüz alt görev yok.'),
                );
              }
              return ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: subtasks.length,
                itemBuilder: (context, index) {
                  final item = subtasks[index];
                  return CheckboxListTile(
                    value: item.isDone,
                    title: Text(
                      item.title,
                      style: TextStyle(
                        decoration: item.isDone
                            ? TextDecoration.lineThrough
                            : TextDecoration.none,
                      ),
                    ),
                    onChanged: (checked) async {
                      if (checked == null) return;
                      try {
                        await ref
                            .read(subtasksProvider(widget.scope).notifier)
                            .toggle(item.id, checked);
                      } on TaskException catch (error) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context)
                            ..hideCurrentSnackBar()
                            ..showSnackBar(
                              SnackBar(content: Text(error.message)),
                            );
                        }
                      }
                    },
                  );
                },
              );
            },
          ),
        ),
        const Divider(height: 1),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    enabled: !_adding,
                    decoration: const InputDecoration(
                      hintText: 'Yeni alt görev…',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onSubmitted: (_) => _add(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _adding ? null : _add,
                  icon: _adding
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.add),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
