import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NoteService } from './note.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createSupabaseClientMock } from '../test/supabase-query-mock';

describe('NoteService', () => {
  let service: NoteService;
  let supabaseService: { getClient: jest.Mock };

  async function build(
    clientMock: ReturnType<typeof createSupabaseClientMock>,
  ) {
    supabaseService = { getClient: jest.fn(() => clientMock) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoteService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();

    service = module.get<NoteService>(NoteService);
  }

  it('should be defined', async () => {
    await build(createSupabaseClientMock({ notes: { data: null } }));
    expect(service).toBeDefined();
  });

  it('create() başarılı insert sonrası kaydı döner', async () => {
    const note = {
      id: 'note-1',
      title: 'Test',
      workspace_id: 'ws-1',
      user_id: 'u-1',
    };
    await build(createSupabaseClientMock({ notes: { data: note } }));

    const result = await service.create('ws-1', 'u-1', {
      title: 'Test',
    });

    expect(result).toEqual(note);
  });

  it('create() Supabase hatasında BadRequestException fırlatır', async () => {
    await build(
      createSupabaseClientMock({
        notes: { data: null, error: { message: 'insert failed' } },
      }),
    );

    await expect(
      service.create('ws-1', 'u-1', { title: 'Test' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findOne() kayıt yoksa NotFoundException fırlatır', async () => {
    await build(createSupabaseClientMock({ notes: { data: null } }));

    await expect(
      service.findOne('ws-1', 'u-1', 'missing-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getUserDashboard() 3 kaynağı paralel toplar', async () => {
    const notes = [{ id: 'n1' }];
    const projects = [{ id: 'p1' }, { id: 'p2' }];
    const tasks = [{ id: 't1' }];
    await build(
      createSupabaseClientMock({
        notes: { data: notes },
        projects: { data: projects },
        tasks: { data: tasks },
      }),
    );

    const result = await service.getUserDashboard('ws-1', 'u-1');

    expect(result).toEqual({
      recentNotes: notes,
      activeProjects: projects,
      currentTasks: tasks,
    });
  });
});
