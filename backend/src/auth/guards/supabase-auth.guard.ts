import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      throw new UnauthorizedException(
        'Authorization başlığında Bearer token bulunamadı.',
      );
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .auth.getUser(token);

    if (error || !data?.user) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş token.');
    }

    request.user = data.user;
    return true;
  }
}
