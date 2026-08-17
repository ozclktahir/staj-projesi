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

    // Yetki kontrolü RLS'ye takılmamalı: `SUPABASE_KEY` ortama göre anon veya
    // service_role olabiliyor. Anon anahtarla `workspaces`/`workspace_members`
    // okumaları boş dönüp herkesi (sahip dahil) engellerdi — service role
    // istemcisi varsa onu tercih ediyoruz.
    const client =
      this.supabaseService.getAdminClient() ?? this.supabaseService.getClient();

    const [membershipResult, ownerResult] = await Promise.all([
      client
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle(),
      // Workspace'in gerçek sahibi her zaman OWNER sayılır. Aksi hâlde
      // workspace_members satırı olmayan (ör. eski kayıtlar veya
      // 'OWNER' rolünü reddeden CHECK kısıtı yüzünden insert'i düşen)
      // bir sahip kendi çalışma alanında 403 alıyordu — üye rolü
      // değiştirme bu yüzden sessizce başarısız oluyordu.
      client
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .eq('owner_id', userId)
        .maybeSingle(),
    ]);

    const membershipRole =
      typeof membershipResult.data?.role === 'string'
        ? membershipResult.data.role
        : null;
    // Sahiplik iki yoldan gelebilir: workspaces.owner_id VEYA
    // workspace_members.role = 'OWNER' (şemaya göre biri ya da diğeri dolu).
    const isOwner =
      Boolean(ownerResult.data?.id) ||
      (membershipRole ?? '').toLowerCase() === 'owner';

    // Üyelik zorunlu: @Roles olmasa bile workspace üyesi olmayan herkes engellenir.
    if (!isOwner && (membershipResult.error || !membershipRole)) {
      throw new ForbiddenException('Bu workspace\'e erişim izniniz yok');
    }

    if (requiredRoles && requiredRoles.length > 0) {
      const effectiveRole = isOwner ? 'OWNER' : (membershipRole as string);
      const allowed = requiredRoles.some(
        (role) => role.toLowerCase() === effectiveRole.toLowerCase(),
      );
      // Sahip, Admin gerektiren her uca da erişebilir.
      const ownerCoversAdmin =
        isOwner && requiredRoles.some((role) => role.toLowerCase() === 'admin');

      if (!allowed && !ownerCoversAdmin) {
        throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
      }
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
