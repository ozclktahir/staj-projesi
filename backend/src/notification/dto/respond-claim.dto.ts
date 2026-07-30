import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class RespondClaimDto {
  @ApiProperty({
    enum: ['accept', 'decline'],
    example: 'accept',
    description: 'Görev sahiplenme kararı',
  })
  @IsIn(['accept', 'decline'])
  decision: 'accept' | 'decline';
}
