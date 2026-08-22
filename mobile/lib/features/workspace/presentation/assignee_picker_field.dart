import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../data/workspace_member_dto.dart';
import '../providers/workspace_capabilities_provider.dart';
import '../providers/workspace_members_provider.dart';

/// Üye dropdown — Admin tüm üyeleri, Member yalnızca kendisini görür.
class AssigneePickerField extends ConsumerWidget {
  const AssigneePickerField({
    super.key,
    required this.value,
    required this.onChanged,
    this.enabled = true,
    this.allowUnassigned = true,
    this.labelText = 'Atanan',
  });

  final String? value;
  final ValueChanged<String?> onChanged;
  final bool enabled;
  final bool allowUnassigned;
  final String labelText;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync = ref.watch(workspaceMembersProvider);
    final caps = ref.watch(workspaceCapabilitiesProvider);
    final userId = ref.watch(authProvider.select((s) => s.userId));

    return membersAsync.when(
      loading: () => InputDecorator(
        decoration: InputDecoration(
          labelText: labelText,
          border: const OutlineInputBorder(),
        ),
        child: const SizedBox(
          height: 24,
          child: Align(
            alignment: Alignment.centerLeft,
            child: SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        ),
      ),
      error: (error, _) => InputDecorator(
        decoration: InputDecoration(
          labelText: labelText,
          border: const OutlineInputBorder(),
          errorText: error.toString(),
        ),
        child: const Text('Üyeler yüklenemedi'),
      ),
      data: (members) {
        final options = _resolveOptions(
          members: members,
          isAdmin: caps.isAdmin,
          userId: userId,
        );
        final lockedToSelf = !caps.isAdmin && options.length <= 1;
        final effectiveValue = _effectiveValue(
          value: value,
          options: options,
          allowUnassigned: allowUnassigned && !lockedToSelf,
          userId: userId,
          lockedToSelf: lockedToSelf,
        );

        return DropdownButtonFormField<String?>(
          // ignore: deprecated_member_use
          value: effectiveValue,
          decoration: InputDecoration(
            labelText: labelText,
            border: const OutlineInputBorder(),
            helperText: lockedToSelf
                ? 'Üye olarak yalnızca kendinize atayabilirsiniz.'
                : null,
          ),
          items: [
            if (allowUnassigned && !lockedToSelf)
              const DropdownMenuItem<String?>(
                value: null,
                child: Text('Atanmamış'),
              ),
            for (final member in options)
              DropdownMenuItem<String?>(
                value: member.id,
                child: Text(member.label, overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: (!enabled || lockedToSelf)
              ? null
              : (next) => onChanged(next),
        );
      },
    );
  }

  List<WorkspaceMemberDto> _resolveOptions({
    required List<WorkspaceMemberDto> members,
    required bool isAdmin,
    required String? userId,
  }) {
    if (isAdmin) return members;
    if (userId == null) return const [];
    final self = members.where((m) => m.id == userId).toList();
    if (self.isNotEmpty) return self;
    return [
      WorkspaceMemberDto(
        id: userId,
        displayName: 'Ben',
      ),
    ];
  }

  String? _effectiveValue({
    required String? value,
    required List<WorkspaceMemberDto> options,
    required bool allowUnassigned,
    required String? userId,
    required bool lockedToSelf,
  }) {
    if (lockedToSelf) {
      return options.isNotEmpty ? options.first.id : userId;
    }
    if (value == null || value.isEmpty) {
      return allowUnassigned ? null : (options.isNotEmpty ? options.first.id : null);
    }
    final known = options.any((m) => m.id == value);
    if (known) return value;
    return allowUnassigned ? null : (options.isNotEmpty ? options.first.id : null);
  }
}
