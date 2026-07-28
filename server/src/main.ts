// ponytail: tracing.ts must be imported BEFORE any NestJS / http / express module is
// required so NodeSDK can monkey-patch them. TS keeps the import order, so this stays first.
import './tracing';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('PORT');
  const origins = config
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api/v1');
  const bodyLimit = config.get<string>('STORAGE_HTTP_BODY_LIMIT') ?? '15mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: false }));
  // ponytail: v3.0.3 hardening ticket #2 - browser security baseline. CSP allows
  // the SPA to talk to its own /api/v1 origin; everything else is locked to same-origin.
  // frameAncestors 'none' blocks clickjacking embedding. HSTS preload enabled.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    }),
  );
  app.enableCors({ origin: origins, credentials: true });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('销卓宝 v3 API')
    .setDescription('销卓宝移动端与管理后台共用 REST API')
    .setVersion('3.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
