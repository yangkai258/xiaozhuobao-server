import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { FeatureModule } from '../feature/feature.module';

@Module({ imports: [FeatureModule], controllers: [AiController], providers: [AiService] })
export class AiModule {}
