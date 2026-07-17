import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'Ali',
    description: 'Kullanıcının adı',
  })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({
    example: 'Yılmaz',
    description: 'Kullanıcının soyadı',
  })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Kullanıcının e-posta adresi',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'sifre123',
    description: 'Kullanıcının şifresi (en az 6 karakter)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
