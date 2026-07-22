import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Counter, Histogram, metrics } from '@opentelemetry/api';

// ponytail: MetricsService holds module-level OTel instruments created lazily from
// the global meter; tests use jest.unstable_mockModule on @opentelemetry/api if they
// need to assert specific counter increments.
@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly meter = metrics.getMeter('xzb-server', '1.0.0');
  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestErrors: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly idempotencyReplays: Counter;
  private readonly orderStateTransitions: Counter;
  private readonly bizSubmissions: Counter;
  private readonly productStockReservations: Counter;

  constructor() {
    this.httpRequestsTotal = this.meter.createCounter('http_requests_total', {
      description: 'Total HTTP requests served',
    });
    this.httpRequestErrors = this.meter.createCounter('http_requests_error_total', {
      description: 'HTTP requests that returned a non-2xx response',
    });
    this.httpRequestDuration = this.meter.createHistogram('http_request_duration_seconds', {
      description: 'HTTP request latency in seconds',
      unit: 's',
    });
    this.idempotencyReplays = this.meter.createCounter('idempotency_replay_total', {
      description: 'Idempotency-Key replays (in-process + cross-process)',
    });
    this.orderStateTransitions = this.meter.createCounter('order_state_transition_total', {
      description: 'Order state machine transitions',
    });
    this.bizSubmissions = this.meter.createCounter('biz_submission_total', {
      description: 'BizSubmission lifecycle events (kind + status)',
    });
    this.productStockReservations = this.meter.createCounter('product_stock_reservation_total', {
      description: 'Order stock reservation outcomes (reserved | insufficient)',
    });
  }

  recordHttpRequest(input: { method: string; route: string; status: number; durationSeconds: number }): void {
    const { method, route, status, durationSeconds } = input;
    const labels = { method, route, status: String(status) };
    this.httpRequestsTotal.add(1, labels);
    this.httpRequestDuration.record(durationSeconds, { method, route });
    if (status >= 400) {
      this.httpRequestErrors.add(1, labels);
    }
  }

  recordIdempotencyReplay(endpoint: string): void {
    this.idempotencyReplays.add(1, { endpoint });
  }

  recordOrderStateTransition(from: string, to: string): void {
    this.orderStateTransitions.add(1, { from, to });
  }

  recordBizSubmission(kind: string, status: string): void {
    this.bizSubmissions.add(1, { kind, status });
  }

  recordProductStockReservation(outcome: 'reserved' | 'insufficient'): void {
    this.productStockReservations.add(1, { outcome });
  }

  onModuleDestroy(): void {
    // ponytail: meter instruments live in the OTel SDK; PrometheusExporter tears down
    // on NodeSDK.shutdown(). Nothing to do here today.
  }
}
