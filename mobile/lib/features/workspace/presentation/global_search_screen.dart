import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/theme_provider.dart';
import '../../invitations/presentation/invite_member_dialog.dart';
import '../data/search_hit_dto.dart';
import '../providers/home_tab_provider.dart';
import '../providers/search_provider.dart';
import '../providers/workspace_provider.dart';
import 'workspace_switcher.dart';

class _SearchCommand {
  const _SearchCommand({
    required this.label,
    required this.icon,
    required this.run,
  });

  final String label;
  final IconData icon;
  final void Function(BuildContext context, WidgetRef ref) run;
}

/// Dokunmatik arama ekranı — web'deki Cmd/Ctrl+K komut paletinin mobil
/// karşılığı (klavye kısayolu yerine AppBar'daki arama ikonuyla açılır).
/// Web ile aynı ayrım: içerik arama (proje/görev/üye/not) + uygulama
/// eylemlerini tetikleyen bir "Komutlar" bölümü.
class GlobalSearchScreen extends ConsumerStatefulWidget {
  const GlobalSearchScreen({super.key});

  @override
  ConsumerState<GlobalSearchScreen> createState() => _GlobalSearchScreenState();
}

class _GlobalSearchScreenState extends ConsumerState<GlobalSearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      ref.read(globalSearchProvider.notifier).search(value);
    });
    setState(() {});
  }

  List<_SearchCommand> _commands() {
    return [
      _SearchCommand(
        label: 'Üye davet et',
        icon: Icons.person_add_alt_outlined,
        run: (context, ref) {
          final workspaceId = ref.read(workspaceProvider).activeWorkspace?.id;
          if (workspaceId == null) return;
          unawaited(
            showInviteMemberDialog(context, ref, workspaceId: workspaceId),
          );
        },
      ),
      _SearchCommand(
        label: 'Yeni workspace oluştur',
        icon: Icons.add_business_outlined,
        run: (context, ref) =>
            unawaited(showCreateWorkspaceDialog(context, ref)),
      ),
      _SearchCommand(
        label: 'Temayı değiştir (Açık/Koyu)',
        icon: Icons.brightness_6_outlined,
        run: (context, ref) {
          final notifier = ref.read(themeModeProvider.notifier);
          final current = ref.read(themeModeProvider);
          final isDark =
              current == ThemeMode.dark ||
              (current == ThemeMode.system &&
                  MediaQuery.platformBrightnessOf(context) == Brightness.dark);
          unawaited(
            notifier.setThemeMode(isDark ? ThemeMode.light : ThemeMode.dark),
          );
        },
      ),
    ];
  }

  List<_SearchCommand> _filteredCommands() {
    final query = _controller.text.trim().toLowerCase();
    final all = _commands();
    if (query.isEmpty) return all;
    return all
        .where((c) => c.label.toLowerCase().contains(query))
        .toList(growable: false);
  }

  void _onTapHit(SearchHitDto hit) {
    switch (hit.type) {
      case SearchHitType.project:
        context.push(
          '${AppRoutes.projectDetail(hit.id)}?name=${Uri.encodeComponent(hit.title)}',
        );
      case SearchHitType.task:
        final projectId = hit.projectId;
        if (projectId != null && projectId.isNotEmpty) {
          context.push(AppRoutes.projectDetail(projectId));
        }
      case SearchHitType.member:
        context.push(AppRoutes.members);
      case SearchHitType.note:
      case SearchHitType.todo:
        // Kişisel not/görev bir rota değil, ana ekrandaki Kişisel Alan sekmesi.
        ref.read(homeTabProvider.notifier).state = HomeTab.personal;
        context.pop();
      case SearchHitType.unknown:
        break;
    }
  }

  IconData _iconFor(SearchHitType type) {
    switch (type) {
      case SearchHitType.project:
        return Icons.folder_outlined;
      case SearchHitType.task:
        return Icons.task_alt_outlined;
      case SearchHitType.member:
        return Icons.person_outline;
      case SearchHitType.note:
        return Icons.sticky_note_2_outlined;
      case SearchHitType.todo:
        return Icons.checklist_outlined;
      case SearchHitType.unknown:
        return Icons.search;
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(appStringsProvider);
    final hasWorkspace = ref.watch(
      workspaceProvider.select((ws) => ws.activeWorkspace != null),
    );
    final state = ref.watch(globalSearchProvider);
    final scheme = Theme.of(context).colorScheme;
    final commands = _filteredCommands();

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: true,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: s.searchPlaceholder,
            border: InputBorder.none,
          ),
          onChanged: _onChanged,
        ),
        actions: [
          if (_controller.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _controller.clear();
                ref.read(globalSearchProvider.notifier).clear();
                setState(() {});
              },
            ),
        ],
      ),
      body: !hasWorkspace
          ? Center(child: Text(s.dashboardNoWorkspace))
          : Column(
              children: [
                if (commands.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: Text(
                      'KOMUTLAR',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                  for (final command in commands)
                    ListTile(
                      leading: Icon(command.icon, color: scheme.primary),
                      title: Text(command.label),
                      onTap: () => command.run(context, ref),
                    ),
                  const Divider(height: 1),
                ],
                Expanded(
                  child: state.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (error, _) => Center(child: Text(error.toString())),
                    data: (hits) {
                      if (_controller.text.trim().isEmpty) {
                        return commands.isNotEmpty
                            ? const SizedBox.shrink()
                            : Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(24),
                                  child: Text(
                                    s.searchHint,
                                    textAlign: TextAlign.center,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(
                                          color: scheme.onSurfaceVariant,
                                        ),
                                  ),
                                ),
                              );
                      }
                      if (hits.isEmpty) {
                        return commands.isNotEmpty
                            ? const SizedBox.shrink()
                            : Center(child: Text(s.searchEmpty));
                      }
                      return ListView.separated(
                        itemCount: hits.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final hit = hits[index];
                          return ListTile(
                            leading: Icon(_iconFor(hit.type)),
                            title: Text(hit.title),
                            subtitle:
                                hit.subtitle != null && hit.subtitle!.isNotEmpty
                                ? Text(hit.subtitle!)
                                : null,
                            onTap: () => _onTapHit(hit),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
