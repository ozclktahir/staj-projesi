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
});
