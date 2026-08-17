import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/workspace_members_provider.dart';

/// Çoklu atama seçici ("Ek Atananlar") — görev OLUŞTURULURKEN kullanılır.
///
/// Web'deki CreateTaskModal'ın çoklu atama listesinin mobil karşılığı. Yalnızca
/// admin/OWNER'a gösterilir (çağıran karar verir); birincil atanan listede
/// devre dışı görünür, çünkü zaten `assignee_id` ile atanmıştır.
class ExtraAssigneesField extends ConsumerWidget {
  const ExtraAssigneesField({
    super.key,
    required this.selectedIds,
    required this.onChanged,
    this.primaryAssigneeId,
    this.enabled = true,
  });

  final List<String> selectedIds;
  final ValueChanged<List<String>> onChanged;
  final String? primaryAssigneeId;
  final bool enabled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync = ref.watch(workspaceMembersProvider);
    final theme = Theme.of(context);

    return membersAsync.when(
      loading: () => const SizedBox(
        height: 48,
        child: Center(
          child: SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      ),
      error: (error, _) => Text(
        'Üyeler yüklenemedi',
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.error,
        ),
      ),
      data: (members) {
        if (members.isEmpty) {
          return Text(
            'Üye bulunamadı.',
            style: theme.textTheme.bodySmall,
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Ek Atananlar (${selectedIds.length})',
                style: theme.textTheme.labelLarge,
              ),
            ),
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 160),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  border: Border.all(color: theme.dividerColor),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    for (final member in members)
                      CheckboxListTile(
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        controlAffinity: ListTileControlAffinity.leading,
                        value: selectedIds.contains(member.id),
                        title: Text(
                          member.id == primaryAssigneeId
                              ? '${member.label} — birincil atanan'
                              : member.label,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodyMedium,
                        ),
                        onChanged:
                            (!enabled || member.id == primaryAssigneeId)
                                ? null
                                : (checked) {
                                    final next = [...selectedIds];
                                    if (checked ?? false) {
                                      if (!next.contains(member.id)) {
                                        next.add(member.id);
                                      }
                                    } else {
                                      next.remove(member.id);
                                    }
                                    onChanged(next);
                                  },
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Birincil atanana ek olarak bu görevi görebilecek üyeler.',
              style: theme.textTheme.bodySmall,
            ),
          ],
        );
      },
    );
  }
}
