import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export type ReportType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export const REPORT_TYPES: ReportType[] = ['DAILY', 'WEEKLY', 'MONTHLY'];

export class CreateProgressReportDto {
  @ApiProperty({
    example: 'DAILY',
    description: 'İlerleme raporunun periyodu',
    enum: REPORT_TYPES,
  })
  @IsNotEmpty()
  @IsIn(REPORT_TYPES)
  report_type: ReportType;

  @ApiProperty({
    example: 'Haftalık İlerleme Raporu - 14 Temmuz',
    description: 'Rapor başlığı',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Bu hafta Task modülüne arama ve sayfalama özellikleri eklendi.',
    description: 'Rapor içeriği',
  })
  @IsNotEmpty()
  @IsString()
  content: string;
}
