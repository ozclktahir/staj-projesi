import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({
    example: 'Pazarlama Ekibi',
    description: 'Çalışma alanının adı',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Pazarlama ekibinin proje ve görevlerini yönettiği alan.',
    description: 'Çalışma alanı açıklaması (opsiyonel)',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
