import { Test, TestingModule } from '@nestjs/testing';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';

describe('NoteController', () => {
  let controller: NoteController;
  const noteServiceMock = {
    getUserDashboard: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NoteController],
      providers: [{ provide: NoteService, useValue: noteServiceMock }],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WorkspaceRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NoteController>(NoteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMyDashboard() workspaceId ve user.id ile servisi çağırır', () => {
    noteServiceMock.getUserDashboard.mockReturnValue({ recentNotes: [] });

    controller.getMyDashboard('ws-1', { id: 'u-1' });

    expect(noteServiceMock.getUserDashboard).toHaveBeenCalledWith(
      'ws-1',
      'u-1',
    );
  });

  it('create() workspaceId, user.id ve dto ile servisi çağırır', () => {
    const dto = { title: 'Not' } as any;

    controller.create('ws-1', { id: 'u-1' }, dto);

    expect(noteServiceMock.create).toHaveBeenCalledWith('ws-1', 'u-1', dto);
  });
});
