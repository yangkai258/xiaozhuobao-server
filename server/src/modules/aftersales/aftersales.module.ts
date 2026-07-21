import { Module } from '@nestjs/common';
import { AftersalesController } from './aftersales.controller';
import { AftersalesService } from './aftersales.service';

@Module({ controllers: [AftersalesController], providers: [AftersalesService] })
export class AftersalesModule {}
