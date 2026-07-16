import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

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
}
