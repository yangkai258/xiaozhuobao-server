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
// ponytail: v3.0.3 hardening ticket #6 - when OTEL_EXPORTER_OTLP_ENDPOINT is set we also wire
// a BatchLogRecordProcessor + OTLP log exporter; StructuredLogger emits to it via the api-logs
// global logger provider. traceExporter stays noop when no endpoint is configured (in-process
// monkey-patching is enough for local dev).
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const logExporter = otlpEndpoint
  ? new (require('@opentelemetry/exporter-logs-otlp-http').OTLPLogExporter)({ url: `${otlpEndpoint}/v1/logs` })
  : null;
const logProcessor = logExporter ? new (require('@opentelemetry/sdk-logs').BatchLogRecordProcessor)(logExporter) : null;
const logProvider = logProcessor ? new (require('@opentelemetry/sdk-logs').LoggerProvider)({ resource: undefined, processors: [logProcessor] }) : null;
if (logProvider) {
  // ponytail: register as the global OTel logger so any caller using api-logs can pick it up.
  // StructuredLogger checks logs.getLogger('xzb-server') and emits to it when present.
  require('@opentelemetry/api-logs').logs.setGlobalLoggerProvider(logProvider);
}

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
    if (logProvider) await logProvider.shutdown().catch(() => undefined);
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
