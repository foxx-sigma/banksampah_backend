import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AppKeyGuard,
  JwtAuthGuard,
  RolesGuard,
  GlobalExceptionFilter,
  TransformInterceptor,
} from '../src/common/index.js';
import { of } from 'rxjs';

describe('Common Infrastructure', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('AppKeyGuard', () => {
    let prismaMock: any;
    let guard: AppKeyGuard;

    beforeEach(() => {
      prismaMock = {
        appMaker: {
          findUnique: vi.fn(),
        },
      };
      guard = new AppKeyGuard(reflector, prismaMock);
    });

    it('should skip validation if @SkipAppKey is set', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({ headers: {} }),
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw 401 Unauthorized if x-app-key is missing', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({ headers: {} }),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw 401 Unauthorized if x-app-key is not found in database', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      prismaMock.appMaker.findUnique.mockResolvedValue(null);

      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            headers: { 'x-app-key': 'invalid-key' },
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should bind appMakerId and allow request if x-app-key is valid', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      prismaMock.appMaker.findUnique.mockResolvedValue({
        id: 'maker-123',
        appKey: 'valid-key',
      });

      const req: any = {
        headers: { 'x-app-key': 'valid-key' },
      };

      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(req),
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(req.appMakerId).toBe('maker-123');
      expect(req.appMaker).toBeDefined();
    });
  });

  describe('JwtAuthGuard', () => {
    let jwtServiceMock: any;
    let configServiceMock: any;
    let guard: JwtAuthGuard;

    beforeEach(() => {
      jwtServiceMock = {
        verifyAsync: vi.fn(),
      };
      configServiceMock = {
        get: vi.fn().mockReturnValue('test-secret'),
      };
      guard = new JwtAuthGuard(reflector, jwtServiceMock, configServiceMock);
    });

    it('should allow public routes without token', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({ headers: {} }),
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw 401 if Authorization header is missing on protected route', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({ headers: {} }),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw 401 if token is invalid', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            headers: { authorization: 'Bearer bad-token' },
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should bind request.user if token is valid', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const payload = { sub: 'u1', username: 'john', role: 'NASABAH' };
      jwtServiceMock.verifyAsync.mockResolvedValue(payload);

      const req: any = {
        headers: { authorization: 'Bearer good-token' },
      };

      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(req),
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(req.user).toEqual(payload);
    });

    it('should throw 401 if cross-tenant appMakerId does not match', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const payload = {
        sub: 'u1',
        username: 'john',
        role: 'NASABAH',
        appMakerId: 'tenant-a',
      };
      jwtServiceMock.verifyAsync.mockResolvedValue(payload);

      const req: any = {
        headers: { authorization: 'Bearer good-token' },
        appMakerId: 'tenant-b',
      };

      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(req),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw 401 if JWT_SECRET is missing', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      configServiceMock.get.mockReturnValue(undefined);
      delete process.env.JWT_SECRET;

      const req: any = {
        headers: { authorization: 'Bearer good-token' },
      };

      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(req),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('RolesGuard', () => {
    let guard: RolesGuard;

    beforeEach(() => {
      guard = new RolesGuard(reflector);
    });

    it('should allow if no roles required', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({ user: { role: 'NASABAH' } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw 403 Forbidden if user does not have required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({ user: { role: 'NASABAH' } }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow if user has required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({ user: { role: 'ADMIN' } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('GlobalExceptionFilter', () => {
    let filter: GlobalExceptionFilter;

    beforeEach(() => {
      filter = new GlobalExceptionFilter();
    });

    it('should format HttpException correctly according to SPEC 3.3', () => {
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

      const host = {
        switchToHttp: vi.fn().mockReturnValue({
          getResponse: vi.fn().mockReturnValue({ status: statusMock }),
        }),
      } as unknown as any;

      const exception = new HttpException('Resource tidak ditemukan', HttpStatus.NOT_FOUND);
      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          success: false,
          message: 'Resource tidak ditemukan',
          errors: null,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should format validation errors array correctly', () => {
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

      const host = {
        switchToHttp: vi.fn().mockReturnValue({
          getResponse: vi.fn().mockReturnValue({ status: statusMock }),
        }),
      } as unknown as any;

      const exception = new HttpException(
        {
          statusCode: 400,
          message: ['email harus valid', 'password minimal 6 karakter'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          success: false,
          message: 'Validasi data gagal',
          errors: ['email harus valid', 'password minimal 6 karakter'],
          timestamp: expect.any(String),
        }),
      );
    });

    it('should format Prisma P2002 unique constraint error cleanly', () => {
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

      const host = {
        switchToHttp: vi.fn().mockReturnValue({
          getResponse: vi.fn().mockReturnValue({ status: statusMock }),
        }),
      } as unknown as any;

      const prismaError = {
        name: 'PrismaClientKnownRequestError',
        code: 'P2002',
        meta: { target: ['email'] },
        message: 'Unique constraint failed on the fields: (`email`)',
      };
      filter.catch(prismaError, host);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          success: false,
          message: 'Data dengan email tersebut sudah terdaftar',
        }),
      );
    });

    it('should format Prisma P2025 not found error cleanly', () => {
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

      const host = {
        switchToHttp: vi.fn().mockReturnValue({
          getResponse: vi.fn().mockReturnValue({ status: statusMock }),
        }),
      } as unknown as any;

      const prismaError = {
        name: 'PrismaClientKnownRequestError',
        code: 'P2025',
        message: 'An operation failed because it depends on one or more records that were required but not found',
      };
      filter.catch(prismaError, host);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          success: false,
          message: 'Data yang diminta tidak ditemukan',
        }),
      );
    });
  });

  describe('TransformInterceptor', () => {
    let interceptor: TransformInterceptor<any>;

    beforeEach(() => {
      interceptor = new TransformInterceptor(reflector);
    });

    it('should wrap successful response in standard format according to SPEC 3.3', async () => {
      const context = {
        getHandler: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getResponse: vi.fn().mockReturnValue({ statusCode: 200 }),
        }),
      } as unknown as ExecutionContext;

      const next = {
        handle: () => of({ foo: 'bar' }),
      };

      const observable = interceptor.intercept(context, next as any);
      observable.subscribe((res) => {
        expect(res).toEqual({
          statusCode: 200,
          success: true,
          message: 'Operasi berhasil',
          data: { foo: 'bar' },
        });
      });
    });
  });
});
