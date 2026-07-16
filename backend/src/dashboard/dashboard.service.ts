import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DashboardService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Workspace istatistiklerini PostgreSQL RPC fonksiyonu üzerinden getirir
   * (`get_workspace_statistics`: tamamlanan, geciken görevler vb.).
   */
  async getWorkspaceStats(workspaceId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client.rpc('get_workspace_statistics', {
      p_workspace_id: workspaceId,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }
}
