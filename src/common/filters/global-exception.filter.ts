import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Terjadi kesalahan internal pada server';
    let errors: string[] | null = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as Record<string, any>;
        if (Array.isArray(resObj.message)) {
          errors = resObj.message;
          message = 'Validasi data gagal';
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
          if (Array.isArray(resObj.errors)) {
            errors = resObj.errors;
          }
        } else if (typeof resObj.error === 'string') {
          message = resObj.error;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
      message = exception.message || 'Terjadi kesalahan pada server';
    } else {
      this.logger.error('Unknown exception thrown', exception);
    }

    response.status(statusCode).json({
      statusCode,
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}
