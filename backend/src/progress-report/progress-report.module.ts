import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProgressReportController } from './progress-report.controller';
import { ProgressReportService } from './progress-report.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ProgressReportController],
  providers: [ProgressReportService],
})
export class ProgressReportModule {}
