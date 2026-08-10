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
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

// Brute-force koruması: kayıt/giriş uçları dakikada 5 istek/IP ile sınırlı.
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
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
  @Throttle(AUTH_THROTTLE)
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

  @Post('refresh')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token ile access token yeniler' })
  @ApiResponse({
    status: 200,
    description: 'Yeni access_token ve refresh_token döner.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token geçersiz veya süresi dolmuş.',
  })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
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
    const header = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    const token =
      typeof header === 'string'
        ? header.replace(/^Bearer\s+/i, '').trim()
        : '';

    if (!token) {
      throw new UnauthorizedException(
        'Authorization başlığında Bearer token bulunamadı.',
      );
    }

    return this.authService.logout(token);
  }
}
