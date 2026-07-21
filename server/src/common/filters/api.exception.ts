import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    public readonly code: number,
    message: string,
    status: HttpStatus,
  ) {
    super(message, status);
  }
}
