import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Public()
  @Get()
  @ApiOperation({ summary: '服务存活检查' })
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // ponytail: v3.0.3 hardening ticket #7 - k8s readinessProbe / livenessProbe.
  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'readiness: 200 if Prisma + Redis answer, else 503' })
  ready(): Promise<{ ok: true; db: string; redis: string }> {
    return this.health.readiness();
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'liveness: always 200, used as the kubelet livenessProbe' })
  live(): { ok: true; uptimeSeconds: number } {
    return this.health.liveness();
  }
}
