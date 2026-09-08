import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Servisin canlı ve ayakta olduğunu kontrol eder' })
  @ApiResponse({ status: 200, description: 'Servis ayakta.' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
