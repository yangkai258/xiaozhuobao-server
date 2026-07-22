import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

if (process.env.OTEL_LOG_LEVEL === 'debug') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

// ponytail: tracing.ts is imported at the very top of main.ts (before NestJS),
// so NodeSDK can monkey-patch http/nestjs modules before they are required.
// Prometheus serves /metrics locally; SDK env settings control OTLP trace export.

const serviceName = process.env.OTEL_SERVICE_NAME ?? process.env.SERVICE_NAME ?? 'xzb-server';
const prometheusPort = Number.parseInt(process.env.OTEL_PROM_PORT ?? '9464', 10);
const noopTraceExporter = {
  export: (_spans: unknown[], result: (value: { code: number }) => void): void => result({ code: 0 }),
  shutdown: async (): Promise<void> => {},
};

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
  }),
  metricReader: new PrometheusExporter({ port: prometheusPort }),
  ...(process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? {} : { traceExporter: noopTraceExporter }),
});

sdk.start();

const shutdown = async (_signal: string): Promise<void> => {
  try {
    await sdk.shutdown();
  } catch (error) {
    console.error('OTel shutdown error', error);
  } finally {
    process.exit(0);
  }
};

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

export { prometheusPort };
