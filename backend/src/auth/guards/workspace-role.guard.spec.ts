import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRoleGuard } from './workspace-role.guard';
import { SupabaseService } from '../../supabase/supabase.service';
import { createSupabaseClientMock } from '../../test/supabase-query-mock';

function buildContext(params: Record<string, string>, userId?: string) {
  const request: any = { params, user: userId ? { id: userId } : undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('WorkspaceRoleGuard', () => {
  function build(membershipRole: string | null, requiredRoles?: string[]) {
    const client = createSupabaseClientMock({
      workspace_members: {
        data: membershipRole ? { role: membershipRole } : null,
      },
    });
    const supabaseService = { getClient: jest.fn(() => client) };
    const reflector = {
      getAllAndOverride: jest.fn(() => requiredRoles),
    } as unknown as Reflector;

    return new WorkspaceRoleGuard(
      reflector,
      supabaseService as unknown as SupabaseService,
    );
  }

  it('workspace bağlamı yoksa ve rol zorunlu değilse izin verir', async () => {
    const guard = build(null, undefined);
    const ctx = buildContext({}, 'u-1');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('workspace bağlamı yoksa ama rol zorunluysa ForbiddenException fırlatır', async () => {
    const guard = build(null, ['Admin']);
    const ctx = buildContext({}, 'u-1');

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('kullanıcı workspace üyesi değilse @Roles olmasa bile engellenir', async () => {
    const guard = build(null, undefined);
    const ctx = buildContext({ workspaceId: 'ws-1' }, 'u-1');

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('Member rolü, Admin gerektiren rotada engellenir', async () => {
    const guard = build('Member', ['Admin']);
    const ctx = buildContext({ workspaceId: 'ws-1' }, 'u-1');

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('Admin rolü, Admin gerektiren rotada izin verilir', async () => {
    const guard = build('Admin', ['Admin']);
    const ctx = buildContext({ workspaceId: 'ws-1' }, 'u-1');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rol zorunlu değilse ve kullanıcı üyeyse izin verilir (Guest okuma ucu)', async () => {
    const guard = build('Guest', undefined);
    const ctx = buildContext({ workspaceId: 'ws-1' }, 'u-1');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('kullanıcı kimliği yoksa ForbiddenException fırlatır', async () => {
    const guard = build('Admin', undefined);
    const ctx = buildContext({ workspaceId: 'ws-1' }, undefined);

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
