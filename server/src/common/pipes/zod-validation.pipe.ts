import { Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { ApiException } from '../filters/api.exception';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodTypeAny) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    const message = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`)
      .join('; ');
    throw new ApiException(40000, message, 400);
  }
}
