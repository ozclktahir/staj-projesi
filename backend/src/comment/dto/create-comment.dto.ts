import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Bu görev üzerinde çalışmaya başladım.',
    description: 'Yorum içeriği',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
