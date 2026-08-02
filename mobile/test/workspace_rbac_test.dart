import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/rbac/workspace_rbac.dart';

void main() {
  group('WorkspaceCapabilities', () {
    test('Guest cannot create task or invite', () {
      final caps = WorkspaceCapabilities.resolve(
        role: 'GUEST',
        ownerId: 'owner-1',
        userId: 'user-2',
      );
      expect(caps.isAdmin, isFalse);
      expect(caps.canInvite, isFalse);
      expect(caps.canCreateProject, isFalse);
      expect(caps.canCreateTask, isFalse);
      expect(caps.canDeleteWorkspace, isFalse);
    });

    test('Member can create task but not invite/delete workspace', () {
      final caps = WorkspaceCapabilities.resolve(
        role: 'Member',
        ownerId: 'owner-1',
        userId: 'user-2',
      );
      expect(caps.canCreateTask, isTrue);
      expect(caps.canInvite, isFalse);
      expect(caps.canCreateProject, isFalse);
      expect(caps.canDeleteWorkspace, isFalse);
    });

    test('Admin can invite and create project, not delete workspace', () {
      final caps = WorkspaceCapabilities.resolve(
        role: 'Admin',
        ownerId: 'owner-1',
        userId: 'admin-2',
      );
      expect(caps.isAdmin, isTrue);
      expect(caps.canInvite, isTrue);
      expect(caps.canCreateProject, isTrue);
      expect(caps.canDeleteWorkspace, isFalse);
    });

    test('Owner by role can delete workspace', () {
      final caps = WorkspaceCapabilities.resolve(
        role: 'OWNER',
        ownerId: 'owner-1',
        userId: 'owner-1',
      );
      expect(caps.isOwner, isTrue);
      expect(caps.canDeleteWorkspace, isTrue);
      expect(caps.canInvite, isTrue);
    });

    test('ownerId match grants owner even if role is Member', () {
      final caps = WorkspaceCapabilities.resolve(
        role: 'Member',
        ownerId: 'u1',
        userId: 'u1',
      );
      expect(caps.isOwner, isTrue);
      expect(caps.canDeleteWorkspace, isTrue);
    });
  });
}
