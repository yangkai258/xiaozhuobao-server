import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { REDIS_CLIENT, REDIS_ENABLED } from './redis.constants';

// ponytail: v3.0.3 hardening ticket #4 - global Redis handle + RedisService for rate-limit
// and idempotency contention. If REDIS_URL is missing (single-node dev), REDIS_ENABLED is
// false and RedisService falls back to the in-process Map it already wraps; the surface is
// stable so callers never branch on which mode is active.
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis | null => {
        const url = config.get<string>('REDIS_URL');
        if (!url) return null;
        return new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3 });
      },
    },
    {
      provide: REDIS_ENABLED,
      inject: [ConfigService],
      useFactory: (config: ConfigService): boolean => Boolean(config.get<string>('REDIS_URL')),
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_ENABLED],
})
export class RedisModule implements OnModuleDestroy {
  constructor() {}
  async onModuleDestroy(): Promise<void> {
    // ioredis cleans up via process exit; nothing extra to do here.
  }
}
