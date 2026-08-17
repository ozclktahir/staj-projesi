import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TaskService } from './task.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { createSupabaseClientMock } from '../test/supabase-query-mock';

describe('TaskService', () => {
  let service: TaskService;
  let notificationGateway: { emitToWorkspace: jest.Mock };

  async function build(byTable: Record<string, any>) {
    const client = createSupabaseClientMock(byTable);
    const supabaseService = { getClient: jest.fn(() => client) };
    notificationGateway = { emitToWorkspace: jest.fn() };
    const notificationService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: NotificationService, useValue: notificationService },
        { provide: NotificationGateway, useValue: notificationGateway },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  }

  describe('findDeleted / restore (soft delete)', () => {
    it('findDeleted() yalnızca deleted_at dolu görevleri döner', async () => {
      const deletedTasks = [{ id: 't1', deleted_at: '2026-01-01T00:00:00Z' }];
      await build({ tasks: { data: deletedTasks } });

      const result = await service.findDeleted('ws-1');

      expect(result).toEqual(deletedTasks);
    });

    it('restore() bulunamazsa NotFoundException fırlatır', async () => {
      await build({ tasks: { data: null } });

      await expect(service.restore('ws-1', 't-missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('restore() başarılıysa görevi (deleted_at temizlenmiş) döner', async () => {
      const restored = { id: 't1', deleted_at: null };
      await build({ tasks: { data: restored } });

      const result = await service.restore('ws-1', 't1');

      expect(result).toEqual(restored);
    });
  });

  describe('requestOrDelete (dual approval yetki kontrolü)', () => {
    it('ne admin ne assignee ne de creator ise ForbiddenException fırlatır', async () => {
      const existing = {
        id: 't1',
        title: 'Görev',
        assignee_id: 'other-user',
        assigned_to: 'other-user',
        created_by: 'creator-user',
        deletion_status: 'none',
      };
      await build({
        tasks: { data: existing },
        workspaces: { data: { owner_id: 'someone-else' } },
        workspace_members: { data: { role: 'Member' } },
      });

      await expect(
        service.requestOrDelete('ws-1', 't1', 'random-actor'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('zaten onay bekleyen görev için BadRequestException fırlatır', async () => {
      const existing = {
        id: 't1',
        title: 'Görev',
        assignee_id: 'u-1',
        created_by: 'u-1',
        deletion_status: 'pending_admin_approval',
      };
      await build({
        tasks: { data: existing },
        workspaces: { data: { owner_id: 'u-1' } },
      });

      await expect(
        service.requestOrDelete('ws-1', 't1', 'u-1'),
      ).rejects.toThrow('zaten bir silme onayı bekleniyor');
    });
  });

  // ── 17 Ağustos 2026: silme HER ZAMAN onaydan geçer (PROGRESS.md madde 6) ──
  describe('requestOrDelete (onaysız silme yok)', () => {
    it('hiç dokunulmamış (TODO, aktivitesiz) görev bile doğrudan silinmez', async () => {
      const existing = {
        id: 't1',
        title: 'Dokunulmamış görev',
        status: 'TODO',
        project_id: 'p1',
        assignee_id: 'assignee-1',
        assigned_to: 'assignee-1',
        created_by: 'admin-1',
        deletion_status: 'none',
      };
      await build({
        tasks: { data: existing },
        workspaces: { data: { owner_id: 'admin-1' } },
        workspace_members: {
          data: { role: 'Admin' },
          listData: [{ user_id: 'admin-1', role: 'Admin' }],
        },
      });

      const result = await service.requestOrDelete('ws-1', 't1', 'admin-1');

      expect(result.mode).toBe('approval_requested');
      expect(result.deletionStatus).toBe('pending_user_approval');
      expect(result.message).toContain('görev silinmedi');
    });

    it('onaylayacak kimse yoksa hiçbir şey değiştirmeden hata verir', async () => {
      const existing = {
        id: 't1',
        title: 'Tek kişilik workspace görevi',
        status: 'TODO',
        project_id: 'p1',
        // Görev talep edenin kendisine atanmış → assignee onaylayıcı olamaz
        assignee_id: 'solo-owner',
        assigned_to: 'solo-owner',
        created_by: 'solo-owner',
        deletion_status: 'none',
      };
      await build({
        tasks: { data: existing },
        // Tek admin: talep edenin kendisi
        workspaces: { data: { owner_id: 'solo-owner' } },
        workspace_members: {
          data: { role: 'Admin' },
          listData: [{ user_id: 'solo-owner', role: 'Admin' }],
        },
      });

      await expect(
        service.requestOrDelete('ws-1', 't1', 'solo-owner'),
      ).rejects.toThrow('onaylayabilecek başka kimse yok');
    });
  });
});
