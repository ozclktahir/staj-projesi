import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProgressReportDto } from './dto/create-progress-report.dto';
import { GetReportsFilterDto } from './dto/get-reports-filter.dto';

@Injectable()
export class ProgressReportService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(
    workspaceId: string,
    userId: string,
    dto: CreateProgressReportDto,
  ) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('progress_reports')
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

  async findAll(workspaceId: string, filterDto: GetReportsFilterDto) {
    const client = this.supabaseService.getClient();
    const { report_type, user_id } = filterDto;
    const page = filterDto.page ?? 1;
    const limit = filterDto.limit ?? 10;

    let query = client
      .from('progress_reports')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId);

    if (report_type) {
      query = query.eq('report_type', report_type);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const total = count ?? 0;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(workspaceId: string, reportId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('progress_reports')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', reportId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('İlerleme raporu bulunamadı.');
    }

    return data;
  }

  async remove(workspaceId: string, reportId: string, userId: string) {
    const client = this.supabaseService.getClient();

    // Not: Şimdilik sadece ID ile silme yapılıyor. "Sadece oluşturan kişi veya
    // Workspace Admin silebilir" iş kuralı, WorkspaceRoleGuard'ın rol bilgisini
    // burada da kontrol edebilmesi için ileride genişletilecektir.
    void userId;

    const { data, error } = await client
      .from('progress_reports')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', reportId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('İlerleme raporu bulunamadı.');
    }

    return { message: 'İlerleme raporu başarıyla silindi.' };
  }
}
