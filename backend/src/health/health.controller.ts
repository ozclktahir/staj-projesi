import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { connect } from 'net';

type NetCheckResult = {
  label: string;
  host: string;
  port: number;
  ok: boolean;
  ms: number;
  error?: string;
};

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Servisin canlı ve ayakta olduğunu kontrol eder' })
  @ApiResponse({ status: 200, description: 'Servis ayakta.' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * GEÇİCİ teşhis ucu — Render'ın giden SMTP portlarını (587/465) engelleyip
   * engellemediğini konteynerin içinden doğrudan test eder (ücretsiz planda
   * Shell erişimi olmadığı için). Teşhis tamamlanınca kaldırılacak.
   */
  @Get('net-check')
  @ApiExcludeEndpoint()
  async netCheck(): Promise<{ results: NetCheckResult[] }> {
    const targets: Array<{ host: string; port: number; label: string }> = [
      { host: 'smtp.gmail.com', port: 587, label: 'gmail-smtp-587' },
      { host: 'smtp.gmail.com', port: 465, label: 'gmail-smtp-465' },
      { host: 'google.com', port: 443, label: 'https-443-kontrol' },
    ];

    const results = await Promise.all(
      targets.map((target) =>
        this.testConnect(target.host, target.port, target.label),
      ),
    );

    return { results };
  }

  private testConnect(
    host: string,
    port: number,
    label: string,
  ): Promise<NetCheckResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = connect({ host, port, timeout: 8000 });
      let settled = false;

      const finish = (ok: boolean, error?: string) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({ label, host, port, ok, ms: Date.now() - start, error });
      };

      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false, 'timeout'));
      socket.once('error', (err) => finish(false, err.message));
    });
  }
}
