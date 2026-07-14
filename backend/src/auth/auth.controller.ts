import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Yeni kullanıcı kaydı oluşturur' })
  @ApiResponse({
    status: 201,
    description: 'Kullanıcı başarıyla oluşturuldu.',
  })
  @ApiResponse({
    status: 400,
    description: 'Geçersiz istek veya kayıt sırasında oluşan hata.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kullanıcı girişi yapar ve oturum bilgisini döner' })
  @ApiResponse({
    status: 200,
    description: 'Giriş başarılı, access_token ve kullanıcı bilgisi döner.',
  })
  @ApiResponse({ status: 401, description: 'Geçersiz kimlik bilgileri.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kullanıcı oturumunu sonlandırır' })
  @ApiResponse({ status: 200, description: 'Çıkış işlemi başarılı.' })
  @ApiResponse({
    status: 401,
    description: 'Authorization başlığı eksik veya geçersiz.',
  })
  logout(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace('Bearer ', '').trim();

    if (!token) {
      throw new UnauthorizedException(
        'Authorization başlığında Bearer token bulunamadı.',
      );
    }

    return this.authService.logout(token);
  }
}
