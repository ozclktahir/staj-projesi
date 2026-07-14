import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../../supabase/supabase.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const workspaceId = request.params?.id ?? request.params?.workspaceId;
    const userId = request.user?.id;

    if (!workspaceId || !userId) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }

    const { data: membership, error } = await this.supabaseService
      .getClient()
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !membership || !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }

    return true;
  }
}
