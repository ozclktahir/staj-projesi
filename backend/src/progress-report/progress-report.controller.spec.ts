import { Test, TestingModule } from '@nestjs/testing';
import { ProgressReportController } from './progress-report.controller';

describe('ProgressReportController', () => {
  let controller: ProgressReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressReportController],
    }).compile();

    controller = module.get<ProgressReportController>(ProgressReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
