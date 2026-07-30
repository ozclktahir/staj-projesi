import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePersonalNoteDto {
  @ApiProperty({ example: 'Toplantı notları' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Madde 1...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string | null;
}

export class UpdatePersonalNoteDto extends PartialType(CreatePersonalNoteDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export class CreatePersonalTodoDto {
  @ApiProperty({ example: 'Raporu gönder' })
  @IsString()
  @IsNotEmpty()
  task: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class UpdatePersonalTodoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  task?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
