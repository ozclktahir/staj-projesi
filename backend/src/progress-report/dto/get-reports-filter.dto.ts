import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { REPORT_TYPES, type ReportType } from './create-progress-report.dto';

export class GetReportsFilterDto {
  @ApiPropertyOptional({
    example: 'WEEKLY',
    description: 'Rapora göre filtrelenecek periyot',
    enum: REPORT_TYPES,
  })
  @IsOptional()
  @IsIn(REPORT_TYPES)
  report_type?: ReportType;

  @ApiPropertyOptional({
    example: '3f1b1b3a-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
    description: 'Rapora göre filtrelenecek kullanıcının UUID değeri',
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Sayfa numarası',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Sayfa başına rapor sayısı',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
