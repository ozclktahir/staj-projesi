import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({
    example: 'Haftalık Planlama Notları',
    description: 'Not başlığı',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: {
      type: 'doc',
      content: [{ type: 'paragraph', text: 'Notion tarzı zengin metin içeriği.' }],
    },
    description:
      'Notion tarzı zengin metin içeriği (JSONB olarak saklanır, blok tabanlı bir yapı önerilir)',
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Opsiyonel ilişkili görev kimliği (nullable)',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  task_id?: string | null;
}
