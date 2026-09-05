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
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      ('code' in exception || 'name' in exception)
    ) {
      const err = exception as any;
      this.logger.error(
        `Database / System exception: ${err.message || err.code}`,
        err.stack,
      );

      if (err.name === 'MulterError') {
        statusCode = HttpStatus.BAD_REQUEST;
        if (err.code === 'LIMIT_FILE_SIZE') {
          message = 'Ukuran file melebihi batas maksimum yang diizinkan';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          message = `Field upload tidak terduga atau tidak dikenali: ${err.field || 'file'}`;
        } else {
          message = `Kesalahan unggah file: ${err.message}`;
        }
        errors = [err.code || err.message];
      } else if (
        err.name === 'PrismaClientKnownRequestError' ||
        typeof err.code === 'string'
      ) {
        switch (err.code) {
          case 'P2002': {
            statusCode = HttpStatus.CONFLICT;
            const target = err.meta?.target;
            const fields = Array.isArray(target) ? target.join(', ') : target;
            message = fields
              ? `Data dengan ${fields} tersebut sudah terdaftar`
              : 'Konflik data unik: data yang dimasukkan sudah ada';
            break;
          }
          case 'P2025': {
            statusCode = HttpStatus.NOT_FOUND;
            message = 'Data yang diminta tidak ditemukan';
            break;
          }
          case 'P2003': {
            statusCode = HttpStatus.BAD_REQUEST;
            message = 'Relasi referensi data tidak valid atau terkait data lain';
            break;
          }
          case 'P2014': {
            statusCode = HttpStatus.BAD_REQUEST;
            message = 'Perubahan data melanggar relasi data yang diperlukan';
            break;
          }
          case 'P2000': {
            statusCode = HttpStatus.BAD_REQUEST;
            message = 'Nilai data yang diberikan melebihi batas panjang maksimum';
            break;
          }
          default: {
            statusCode = HttpStatus.BAD_REQUEST;
            message = `Kesalahan operasi database (${err.code || 'DB_ERROR'})`;
            errors = ['Operasi basis data tidak dapat diproses dengan parameter yang diberikan'];
            break;
          }
        }
      } else if (err.name === 'PrismaClientValidationError') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Format atau tipe data input tidak sesuai dengan skema database';
        errors = ['Format atau tipe data input tidak valid'];
      } else if (exception instanceof Error) {
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Terjadi kesalahan internal pada server';
        errors = null;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Terjadi kesalahan internal pada server';
      errors = null;
    } else {
      this.logger.error('Unknown exception thrown', exception);
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Terjadi kesalahan internal pada server';
      errors = null;
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
