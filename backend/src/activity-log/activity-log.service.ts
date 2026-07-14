import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';

@Injectable()
export class ActivityLogService {
  constructor(private readonly supabaseService: SupabaseService) {}

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

    return data;
  }

  async findAllByWorkspace(workspaceId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('activity_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }
}
