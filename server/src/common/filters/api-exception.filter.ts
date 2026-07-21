import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { ApiRequest } from '../types';
import { ApiException } from './api.exception';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<ApiRequest>();
    const response = context.getResponse<Response>();
    const mapped = this.mapException(exception);

    if (mapped.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    response.status(mapped.status).json({
      code: mapped.code,
      data: null,
      msg: mapped.message,
      traceId: request.traceId,
    });
  }

  private mapException(exception: unknown): { code: number; message: string; status: HttpStatus } {
    if (exception instanceof ApiException) {
      return {
        code: exception.code,
        message: exception.message,
        status: exception.getStatus(),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return { code: 10002, message: '资源已存在', status: HttpStatus.CONFLICT };
      }
      if (exception.code === 'P2025') {
        return { code: 10404, message: '资源不存在', status: HttpStatus.NOT_FOUND };
      }
      return { code: 50001, message: '数据库错误', status: HttpStatus.INTERNAL_SERVER_ERROR };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus() as HttpStatus;
      const response = exception.getResponse();
      const rawMessage =
        typeof response === 'string'
          ? response
          : 'message' in response
            ? response.message
            : exception.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join('; ') : String(rawMessage);
      const code =
        status === HttpStatus.UNAUTHORIZED
          ? 20100
          : status === HttpStatus.FORBIDDEN
            ? 20103
            : status === HttpStatus.NOT_FOUND
              ? 10404
              : status === HttpStatus.TOO_MANY_REQUESTS
                ? 20429
                : status === HttpStatus.CONFLICT
                  ? 10001
                  : status === HttpStatus.UNPROCESSABLE_ENTITY
                    ? 10422
                : status >= HttpStatus.INTERNAL_SERVER_ERROR
                  ? 50000
                  : 40000;
      return { code, message, status };
    }

    return {
      code: 50000,
      message: '服务器内部错误',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }
}
