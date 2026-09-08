import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

function normalizeEmail({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

/** login/request-otp — şifreyi doğrular, TOTP aktif değilse e-posta kodu gönderir. */
export class RequestLoginOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Kullanıcının e-posta adresi',
  })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  email!: string;

  @ApiProperty({
    example: 'sifre123',
    description: 'Kullanıcının şifresi',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password!: string;
}

/** login/verify-otp — e-postaya gönderilen 6 haneli kodu doğrular. */
export class VerifyLoginOtpDto {
  @ApiProperty({
    description: 'login veya login/request-otp yanıtından dönen user_id',
  })
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @ApiProperty({ description: 'E-postaya gönderilen 6 haneli kod' })
  @IsString()
  @Length(6, 6, { message: 'Kod 6 haneli olmalıdır' })
  code!: string;
}
