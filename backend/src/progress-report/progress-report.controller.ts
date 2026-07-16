import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceRoleGuard } from '../auth/guards/workspace-role.guard';
import { CreateProgressReportDto } from './dto/create-progress-report.dto';
import { GetReportsFilterDto } from './dto/get-reports-filter.dto';
import { ProgressReportService } from './progress-report.service';

@ApiTags('Progress Reports')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/progress-reports')
export class ProgressReportController {
  constructor(private readonly progressReportService: ProgressReportService) {}

  @Post()
  @ApiOperation({
    summary:
      'Çalışma alanı içinde yeni bir ilerleme raporu (günlük/haftalık/aylık) oluşturur',
  })
  @ApiResponse({ status: 201, description: 'Rapor başarıyla oluşturuldu.' })
  create(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: any,
    @Body() dto: CreateProgressReportDto,
  ) {
    return this.progressReportService.create(workspaceId, user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Çalışma alanına ait ilerleme raporlarını filtreleme ve sayfalama ile listeler',
  })
  @ApiResponse({ status: 200, description: 'Raporlar listelendi.' })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() filterDto: GetReportsFilterDto,
  ) {
    return this.progressReportService.findAll(workspaceId, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Belirtilen ilerleme raporunun detayını getirir' })
  @ApiResponse({ status: 200, description: 'Rapor bulundu.' })
  @ApiResponse({ status: 404, description: 'Rapor bulunamadı.' })
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.progressReportService.findOne(workspaceId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Belirtilen ilerleme raporunu siler' })
  @ApiResponse({ status: 200, description: 'Rapor başarıyla silindi.' })
  @ApiResponse({ status: 404, description: 'Rapor bulunamadı.' })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.progressReportService.remove(workspaceId, id, user.id);
  }
}
