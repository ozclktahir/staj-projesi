import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../workspace/providers/workspace_members_provider.dart';

/// Sıralı seçim listesine bir üyeyi ekler/çıkarır.
///
/// `selectedIds[0]` her zaman birincil atanan (`assignee_id`/`assigned_to`)
/// sayılır — claim/onay ve dual-approval-silme akışlarını yönlendiren alan
/// budur. 1. index'ten itibaren `task_assignees` ek atananlar tablosuna
/// karşılık gelir (yalnızca admin/OWNER kaydedebilir).
///
/// `canMultiSelect=false` iken bir üyeyi işaretlemek seçimi TEK kişiye
/// indirger (radyo davranışı) — admin olmayan bir kullanıcı yine de (tek)
/// atananı değiştirebilir, ama ikinci bir kişi ekleyemez. İşareti
/// kaldırmak ise role bakılmaksızın her zaman yalnızca o id'yi çıkarır;
/// admin olmayan biri için bu yerel işlem zararsızdır çünkü ek atananları
/// sunucuya kaydetmek zaten yalnızca admin/OWNER'a açık (bkz. backend
/// `@Roles('OWNER','Admin')` `PUT .../assignees`).
@visibleForTesting
List<String> toggleAssigneeSelection({
  required List<String> selectedIds,
  required String memberId,
  required bool checked,
  required bool canMultiSelect,
}) {
  if (checked) {
    if (selectedIds.contains(memberId)) return selectedIds;
    if (canMultiSelect) return [...selectedIds, memberId];
    return [memberId];
  }
  return [for (final id in selectedIds) if (id != memberId) id];
}

/// Birleşik "Atananlar" seçici.
///
/// Görev oluşturma diyaloğu, görev düzenleme diyaloğu ve görev detay
/// sayfasında AYNI bileşen kullanılır (web'deki
/// `frontend/src/components/task/assignees-field.tsx` ile aynı tasarım).
/// Önceden tekli birincil atanan (`AssigneePickerField`) ve çoklu ek atanan
/// (`ExtraAssigneesField`) diye iki ayrı, birbirini tekrar eden widget
/// vardı — bu ikisinin yerine geçer.
class AssigneesField extends ConsumerWidget {
  const AssigneesField({
    super.key,
    required this.selectedIds,
    required this.onChanged,
    required this.canMultiSelect,
    this.enabled = true,
    this.labelText = 'Atananlar',
    this.helperText,
  });

  /// Sıralı seçim: ilk id birincil atanan, geri kalanı ek atanan.
  final List<String> selectedIds;
  final ValueChanged<List<String>> onChanged;

  /// false ise en fazla 1 kişi seçilebilir (radyo davranışı) — çoklu seçim
  /// admin/OWNER'a özel kalır.
  final bool canMultiSelect;
  final bool enabled;
  final String labelText;
  final String? helperText;

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
          return Text('Üye bulunamadı.', style: theme.textTheme.bodySmall);
        }

        final primaryId = selectedIds.isNotEmpty ? selectedIds.first : null;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                '$labelText (${selectedIds.length})',
                style: theme.textTheme.labelLarge,
              ),
            ),
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 200),
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
                        title: Row(
                          children: [
                            Flexible(
                              child: Text(
                                member.label,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.bodyMedium,
                              ),
                            ),
                            if (member.id == primaryId) ...[
                              const SizedBox(width: 6),
                              const _PrimaryBadge(),
                            ],
                          ],
                        ),
                        onChanged: !enabled
                            ? null
                            : (checked) => onChanged(
                                  toggleAssigneeSelection(
                                    selectedIds: selectedIds,
                                    memberId: member.id,
                                    checked: checked ?? false,
                                    canMultiSelect: canMultiSelect,
                                  ),
                                ),
                      ),
                  ],
                ),
              ),
            ),
            if (helperText != null) ...[
              const SizedBox(height: 4),
              Text(helperText!, style: theme.textTheme.bodySmall),
            ],
          ],
        );
      },
    );
  }
}

class _PrimaryBadge extends StatelessWidget {
  const _PrimaryBadge();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: scheme.primary.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        'birincil',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: scheme.primary,
        ),
      ),
    );
  }
}
