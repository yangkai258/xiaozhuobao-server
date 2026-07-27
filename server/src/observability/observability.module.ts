import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { StructuredLogger } from '../common/logger/structured-logger';

// ponytail: ObservabilityModule is @Global so every feature module can inject
// MetricsService without re-importing it. Tracing bootstrap (src/tracing.ts) is
// still loaded directly from main.ts before NestFactory.create.
@Global()
@Module({
  providers: [MetricsService, StructuredLogger],
  exports: [MetricsService, StructuredLogger],
})
export class ObservabilityModule {}
