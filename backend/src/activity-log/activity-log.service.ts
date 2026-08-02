import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationGateway } from '../notification/notification.gateway';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';

@Injectable()
export class ActivityLogService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async logAction(
    workspaceId: string,
    userId: string,
    dto: CreateActivityLogDto,
  ) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('activity_logs')
      .insert({
        ...dto,
        workspace_id: workspaceId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    this.notificationGateway.emitToWorkspace(
      workspaceId,
      'activity_logged',
      data,
    );

    return data;
  }

  async findAllByWorkspace(workspaceId: string) {
    const client =
      this.supabaseService.getAdminClient() ??
      this.supabaseService.getClient();

    const { data, error } = await client
      .from('activity_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const rows = data ?? [];
    const userIds = [
      ...new Set(
        rows
          .map((r) => (typeof r.user_id === 'string' ? r.user_id : null))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const nameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await client
        .from('profiles')
        .select('id, email, full_name, first_name, last_name')
        .in('id', userIds);

      for (const p of profiles ?? []) {
        const first =
          typeof p.first_name === 'string' ? p.first_name.trim() : '';
        const last = typeof p.last_name === 'string' ? p.last_name.trim() : '';
        const combined = `${first} ${last}`.trim();
        const full =
          (typeof p.full_name === 'string' && p.full_name.trim()) ||
          combined ||
          (typeof p.email === 'string' && p.email.includes('@')
            ? p.email.split('@')[0]
            : null) ||
          String(p.id).slice(0, 8);
        nameById.set(String(p.id), full);
      }
    }

    return rows.map((row) => {
      const details =
        row.details && typeof row.details === 'object' && !Array.isArray(row.details)
          ? { ...(row.details as Record<string, unknown>) }
          : ({} as Record<string, unknown>);
      const uid = typeof row.user_id === 'string' ? row.user_id : null;
      if (uid && nameById.has(uid) && !details.actor_name && !details.actorName) {
        details.actor_name = nameById.get(uid);
      }
      return { ...row, details };
    });
  }
}
