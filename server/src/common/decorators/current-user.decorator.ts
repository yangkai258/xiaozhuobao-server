import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiRequest, AuthenticatedUser } from '../types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<ApiRequest>();
    return request.user as AuthenticatedUser;
  },
);
