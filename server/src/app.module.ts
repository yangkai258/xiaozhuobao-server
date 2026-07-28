import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { CacheControlInterceptor } from './common/interceptors/cache-control.interceptor';
import { RequestLogInterceptor } from './common/interceptors/request-log.interceptor';
import { TraceIdMiddleware } from './common/middleware/trace-id.middleware';
import { GlobalThrottlerGuard } from './common/throttler/global-throttler.guard';
import { validateEnvironment } from './config/env';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AftersalesModule } from './modules/aftersales/aftersales.module';
import { AiModule } from './modules/ai/ai.module';
import { BizModule } from './modules/biz/biz.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DictsModule } from './modules/dicts/dicts.module';
import { FollowModule } from './modules/follow/follow.module';
import { HealthModule } from './modules/health/health.module';
import { MeModule } from './modules/me/me.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { StorageModule } from './modules/storage/storage.module';
import { FeatureModule } from './modules/feature/feature.module';
import { ObservabilityModule } from './observability/observability.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'global',
            ttl: (config.get<number>('THROTTLE_TTL') ?? 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT') ?? 100,
          },
        ],
      }),
    }),
    ObservabilityModule,
    PrismaModule,
    AuthModule,
    CustomersModule,
    DictsModule,
    ProjectsModule,
    ContractsModule,
    ProductsModule,
    OrdersModule,
    AftersalesModule,
    FollowModule,
    BizModule,
    AiModule,
    MeModule,
    HealthModule,
    StorageModule,
    FeatureModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: GlobalThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RequestLogInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceIdMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
