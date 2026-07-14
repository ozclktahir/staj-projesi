import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    example: 'Web Sitesi Yenileme',
    description: 'Proje adı',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Kurumsal web sitesinin yeni tasarımla yenilenmesi projesi.',
    description: 'Proje açıklaması (opsiyonel)',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
