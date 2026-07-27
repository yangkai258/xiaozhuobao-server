import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeatureService {
  // ponytail: feature flags live in env until phase two's admin UI lands.
  private readonly flags: Record<string, boolean>;

  constructor(config: ConfigService) {
    const aiHome = (config.get<string>('FEATURE_AI_HOME') ?? 'false').toLowerCase() === 'true';
    this.flags = { AI_HOME: aiHome };
  }

  isEnabled(name: string): boolean {
    return this.flags[name] ?? false;
  }

  snapshot(): Record<string, boolean> {
    return { ...this.flags };
  }
}
