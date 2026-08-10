import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProgressReportService } from './progress-report.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createSupabaseClientMock } from '../test/supabase-query-mock';

describe('ProgressReportService', () => {
  let service: ProgressReportService;

  async function build(
    clientMock: ReturnType<typeof createSupabaseClientMock>,
  ) {
    const supabaseService = { getClient: jest.fn(() => clientMock) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressReportService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();

    service = module.get<ProgressReportService>(ProgressReportService);
  }

  it('should be defined', async () => {
    await build(createSupabaseClientMock({ progress_reports: { data: null } }));
    expect(service).toBeDefined();
  });

  it('findOne() bulunamazsa NotFoundException fırlatır', async () => {
    await build(createSupabaseClientMock({ progress_reports: { data: null } }));

    await expect(service.findOne('ws-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove() Supabase hatasında BadRequestException fırlatır', async () => {
    await build(
      createSupabaseClientMock({
        progress_reports: { data: null, error: { message: 'delete failed' } },
      }),
    );

    await expect(
      service.remove('ws-1', 'report-1', 'u-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('remove() başarılı silmede onay mesajı döner', async () => {
    await build(
      createSupabaseClientMock({
        progress_reports: { data: { id: 'report-1' } },
      }),
    );

    const result = await service.remove('ws-1', 'report-1', 'u-1');

    expect(result).toEqual({ message: 'İlerleme raporu başarıyla silindi.' });
  });
});
