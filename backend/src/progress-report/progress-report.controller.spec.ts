import { Test, TestingModule } from '@nestjs/testing';
import { ProgressReportController } from './progress-report.controller';
import { ProgressReportService } from './progress-report.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';

describe('ProgressReportController', () => {
  let controller: ProgressReportController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressReportController],
      providers: [{ provide: ProgressReportService, useValue: serviceMock }],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WorkspaceRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProgressReportController>(ProgressReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('remove() workspaceId, id ve user.id ile servisi çağırır', () => {
    controller.remove('ws-1', 'report-1', { id: 'u-1' });

    expect(serviceMock.remove).toHaveBeenCalledWith('ws-1', 'report-1', 'u-1');
  });
});
