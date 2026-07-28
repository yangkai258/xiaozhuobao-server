import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { ApiException } from '../filters/api.exception';

// ponytail: v3.0.3 hardening ticket #3 - origin allowlist via Set, case-insensitive match,
@Injectable()
export class CorsMiddleware implements NestMiddleware {
  private readonly allowlist: Set<string>;
  private readonly production: boolean;

  constructor(config: ConfigService) {
    const raw = config.getOrThrow<string>('CORS_ORIGINS');
    this.allowlist = new Set(
      raw.split(',').map((origin) => origin.trim().toLowerCase()).filter(Boolean),
    );
    this.production = config.get<string>('NODE_ENV') === 'production';
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const raw = req.header('origin');
    if (raw === undefined) {
      // Same-origin, curl, server-to-server without Origin header - allow.
      next();
      return;
    }
    const origin = raw.toLowerCase();
    if (this.allowlist.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', req.header('access-control-request-headers') ?? 'Authorization,Content-Type,Idempotency-Key,If-Match');
        res.setHeader('Access-Control-Max-Age', '600');
        res.status(204).end();
        return;
      }
      next();
      return;
    }
    if (raw === '' && this.production) {
      // ponytail: production server-to-server (e.g. AI webhook) without Origin.
      next();
      return;
    }
    throw new ApiException(20430, `origin 不在 allowlist: ${raw}`, 403);
  }
}
