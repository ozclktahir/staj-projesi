import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** MFA durum/challenge uçları — access_token Authorization header'ından, refresh_token gövdeden okunur. */
export class MfaSessionDto {
  @ApiProperty({
    description: 'Supabase refresh_token (setSession için access_token ile birlikte gerekli)',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}

export class MfaVerifyDto extends MfaSessionDto {
  @ApiProperty({ description: 'mfa/challenge yanıtından dönen factorId' })
  @IsString()
  @IsNotEmpty()
  factor_id!: string;

  @ApiProperty({ description: 'mfa/challenge yanıtından dönen challengeId' })
  @IsString()
  @IsNotEmpty()
  challenge_id!: string;

  @ApiProperty({ description: 'Authenticator uygulamasından okunan 6 haneli TOTP kodu' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
