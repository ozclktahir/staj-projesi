import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from './create-task.dto';

export class GetTasksFilterDto {
  @ApiPropertyOptional({
    example: 'landing page',
    description: 'Görev başlığında aranacak metin',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'TODO',
    description: 'Göreve göre filtrelenecek durum',
    enum: TASK_STATUSES,
  })
  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @ApiPropertyOptional({
    example: 'MEDIUM',
    description: 'Göreve göre filtrelenecek öncelik',
    enum: TASK_PRIORITIES,
  })
  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '3f1b1b3a-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
    description: 'Atanan kişiye göre filtreleme',
  })
  @IsOptional()
  @IsUUID()
  assignee_id?: string;

  @ApiPropertyOptional({
    example: '7a2c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
    description: 'Üst göreve göre alt görevleri filtreleme',
  })
  @IsOptional()
  @IsUUID()
  parent_task_id?: string;

  @ApiPropertyOptional({
    example: '3f1b1b3a-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
    description: 'Projeye göre görevleri filtreleme (project_id)',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

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
    description: 'Sayfa başına görev sayısı',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
