import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SetTaskAssigneesDto {
  @ApiProperty({
    description: 'Görevin ek atanan kullanıcı ID listesi (tam değiştirir).',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  user_ids: string[];
}
