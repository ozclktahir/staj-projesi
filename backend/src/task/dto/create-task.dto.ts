import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

export class CreateTaskDto {
  @ApiProperty({
    example: 'Landing page tasarımını tamamla',
    description: 'Görev başlığı',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'Figma tasarımına göre ana sayfa bileşenlerini kodla.',
    description: 'Görev açıklaması',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'TODO',
    description: 'Görev durumu',
    enum: TASK_STATUSES,
  })
  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @ApiPropertyOptional({
    example: 'MEDIUM',
    description: 'Görev önceliği',
    enum: TASK_PRIORITIES,
  })
  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '3f1b1b3a-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
    description: 'Görevin atandığı kullanıcının UUID değeri',
  })
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00.000Z',
    description: 'Görevin son teslim tarihi',
  })
  @IsOptional()
  @IsDateString()
  due_date?: string;
}
