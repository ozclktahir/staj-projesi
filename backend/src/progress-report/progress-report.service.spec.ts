import { Test, TestingModule } from '@nestjs/testing';
import { ProgressReportService } from './progress-report.service';

describe('ProgressReportService', () => {
  let service: ProgressReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgressReportService],
    }).compile();

    service = module.get<ProgressReportService>(ProgressReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
