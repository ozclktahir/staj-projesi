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

    const request = context.switchToHttp().getRequest();
    const workspaceId = this.resolveWorkspaceId(request);
    const userId = request.user?.id;

    // Workspace bağlamı yoksa (ör. global auth-only route) üyelik kontrolü uygulanmaz.
    if (!workspaceId) {
      if (requiredRoles && requiredRoles.length > 0) {
        throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
      }
      return true;
    }

    if (!userId) {
      throw new ForbiddenException('Bu workspace\'e erişim izniniz yok');
    }

    const { data: membership, error } = await this.supabaseService
      .getClient()
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    // Üyelik zorunlu: @Roles olmasa bile workspace üyesi olmayan herkes engellenir.
    if (error || !membership) {
      throw new ForbiddenException('Bu workspace\'e erişim izniniz yok');
    }

    if (
      requiredRoles &&
      requiredRoles.length > 0 &&
      !requiredRoles.includes(membership.role)
    ) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }

    return true;
  }

  private resolveWorkspaceId(request: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
  }): string | undefined {
    const fromParams =
      request.params?.workspaceId ?? request.params?.id ?? undefined;
    if (fromParams) {
      return fromParams;
    }

    const fromBody = request.body?.workspaceId;
    if (typeof fromBody === 'string' && fromBody.length > 0) {
      return fromBody;
    }

    const fromQuery = request.query?.workspaceId;
    if (typeof fromQuery === 'string' && fromQuery.length > 0) {
      return fromQuery;
    }

    return undefined;
  }
}
