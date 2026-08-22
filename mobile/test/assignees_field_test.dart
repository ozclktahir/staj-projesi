import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/tasks/presentation/assignees_field.dart';

/// `toggleAssigneeSelection` — AssigneesField'ın (görev oluşturma, düzenleme
/// ve detay ekranında ortak kullanılan atanan seçici) çekirdek seçim
/// mantığı. index 0 her zaman birincil atanan sayılır; admin olmayanlar
/// (canMultiSelect=false) yalnızca tek kişi seçebilir (radyo davranışı).
void main() {
  group('toggleAssigneeSelection', () {
    test('canMultiSelect=true: yeni işaretleme listenin sonuna eklenir', () {
      final result = toggleAssigneeSelection(
        selectedIds: const ['u1'],
        memberId: 'u2',
        checked: true,
        canMultiSelect: true,
      );
      expect(result, ['u1', 'u2']);
    });

    test(
      'canMultiSelect=false: yeni işaretleme TÜM seçimi tek kişiyle '
      'değiştirir (radyo davranışı)',
      () {
        final result = toggleAssigneeSelection(
          selectedIds: const ['u1'],
          memberId: 'u2',
          checked: true,
          canMultiSelect: false,
        );
        expect(result, ['u2']);
      },
    );

    test(
      'işareti kaldırmak role bakılmaksızın yalnızca o id\'yi çıkarır '
      '(admin, çoklu seçim)',
      () {
        final result = toggleAssigneeSelection(
          selectedIds: const ['u1', 'u2', 'u3'],
          memberId: 'u2',
          checked: false,
          canMultiSelect: true,
        );
        expect(result, ['u1', 'u3']);
      },
    );

    test(
      'işareti kaldırmak role bakılmaksızın yalnızca o id\'yi çıkarır '
      '(admin olmayan)',
      () {
        final result = toggleAssigneeSelection(
          selectedIds: const ['u1'],
          memberId: 'u1',
          checked: false,
          canMultiSelect: false,
        );
        expect(result, <String>[]);
      },
    );

    test(
      'birincil (index 0) art arda eklenen ek atananlardan sonra da '
      'listenin başında kalır',
      () {
        var selected = const <String>['u1'];
        selected = toggleAssigneeSelection(
          selectedIds: selected,
          memberId: 'u2',
          checked: true,
          canMultiSelect: true,
        );
        selected = toggleAssigneeSelection(
          selectedIds: selected,
          memberId: 'u3',
          checked: true,
          canMultiSelect: true,
        );
        expect(selected.first, 'u1');
        expect(selected, ['u1', 'u2', 'u3']);
      },
    );

    test('zaten seçili bir id\'yi tekrar işaretlemek listeyi değiştirmez', () {
      final result = toggleAssigneeSelection(
        selectedIds: const ['u1', 'u2'],
        memberId: 'u1',
        checked: true,
        canMultiSelect: true,
      );
      expect(result, ['u1', 'u2']);
    });

    test(
      'boş seçimde admin olmayan biri işaretlerse tek kişilik liste '
      'oluşur ve o kişi birincil olur',
      () {
        final result = toggleAssigneeSelection(
          selectedIds: const [],
          memberId: 'u1',
          checked: true,
          canMultiSelect: false,
        );
        expect(result, ['u1']);
      },
    );
  });
}
