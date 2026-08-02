import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFileDto {
  @ApiProperty({
    example: 'gorev-eki.pdf',
    description: 'Dosyanın adı',
  })
  @IsString()
  @IsNotEmpty()
  file_name: string;

  @ApiProperty({
    example:
      'https://example.supabase.co/storage/v1/object/public/uploads/gorev-eki.pdf',
    description: 'Dosyanın Supabase Storage üzerindeki erişim URL değeri',
  })
  @IsString()
  @IsNotEmpty()
  file_url: string;

  @ApiProperty({
    example: 'application/pdf',
    description: 'Dosyanın MIME tipi',
  })
  @IsString()
  @IsNotEmpty()
  file_type: string;
}
