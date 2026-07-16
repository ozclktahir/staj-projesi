import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ description: "Bildirimin gideceği kullanıcı ID" })
  @IsUUID()
  user_id: string;

  @ApiProperty({ example: 'TASK_ASSIGNED' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'Yeni bir göreve atandınız' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Proje X altında "API entegrasyonu" görevi size atandı.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Opsiyonel ek veri (JSON)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
