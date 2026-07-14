import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateActivityLogDto {
  @ApiProperty({
    example: 'task',
    description: 'Aktivitenin ilişkili olduğu varlık türü (task, project, workspace vb.)',
  })
  @IsString()
  @IsNotEmpty()
  entity_type: string;

  @ApiProperty({
    example: '3f1b1b3a-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
    description: 'İlişkili varlığın UUID değeri',
  })
  @IsUUID()
  entity_id: string;

  @ApiProperty({
    example: 'created',
    description: 'Yapılan işlem (created, updated, deleted, invited vb.)',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({
    example: { field: 'status', from: 'TODO', to: 'DONE' },
    description: 'Aktivite ile ilgili ek detaylar (opsiyonel JSON)',
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}
