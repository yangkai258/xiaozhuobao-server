import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiRequest } from '../types';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<ApiRequest>();
    const response = http.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data: unknown) =>
        response.statusCode === 204
          ? undefined
          : { code: 0, data, msg: 'ok', traceId: request.traceId },
      ),
    );
  }
}
