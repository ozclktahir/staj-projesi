import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async register(dto: RegisterDto) {
    const client = this.supabaseService.getClient();
    const fullName = `${dto.firstName} ${dto.lastName}`.trim();

    const { data, error } = await client.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: {
          first_name: dto.firstName,
          last_name: dto.lastName,
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data.user) {
      throw new BadRequestException('Kullanıcı oluşturulamadı.');
    }

    // Supabase `profiles` tablosu (Prisma User modeli yerine)
    const profilePayload = {
      id: data.user.id,
      email: dto.email,
      first_name: dto.firstName,
      last_name: dto.lastName,
      full_name: fullName,
    };

    let { error: profileError } = await client
      .from('profiles')
      .upsert(profilePayload);

    // first_name / last_name henüz migrate edilmemişse full_name ile devam et
    if (
      profileError &&
      (profileError.message.includes('first_name') ||
        profileError.message.includes('last_name'))
    ) {
      ({ error: profileError } = await client.from('profiles').upsert({
        id: data.user.id,
        email: dto.email,
        full_name: fullName,
      }));
    }

    if (profileError) {
      throw new BadRequestException(profileError.message);
    }

    return data.user;
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      access_token: data.session?.access_token,
      user: data.user,
    };
  }

  async logout(token: string) {
    const { error } = await this.supabaseService
      .getClient()
      .auth.admin.signOut(token);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Çıkış işlemi başarıyla tamamlandı.' };
  }
}
