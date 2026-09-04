import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';

export interface ResponseFormat<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseFormat<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const handler = context.getHandler();
    const customMessage =
      handler && typeof handler === 'function'
        ? this.reflector.get<string>(RESPONSE_MESSAGE_KEY, handler)
        : undefined;

    return next.handle().pipe(
      map((result) => {
        const statusCode = response.statusCode;
        let message =
          customMessage ||
          (statusCode === 201 ? 'Data berhasil dibuat' : 'Operasi berhasil');
        let responseData = result;

        if (result && typeof result === 'object' && !Array.isArray(result)) {
          if ('message' in result && 'data' in result) {
            message = customMessage || result.message || message;
            responseData = result.data;
          } else if (
            'message' in result &&
            Object.keys(result).length === 1
          ) {
            message = customMessage || result.message;
            responseData = null;
          }
        }

        return {
          statusCode,
          success: true,
          message,
          data: responseData ?? null,
        };
      }),
    );
  }
}
