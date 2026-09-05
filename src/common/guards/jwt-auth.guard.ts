import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private getSecret(): string {
    const secret =
      this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException(
        'Konfigurasi server gagal: JWT_SECRET belum disetel',
      );
    }
    return secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (isPublic) {
      if (token) {
        try {
          const secret = this.getSecret();
          const payload = await this.jwtService.verifyAsync(token, {
            secret,
          });

          // Jika token menyertakan tenant, pastikan cocok dengan x-app-key jika ada
          if (
            !request.appMakerId ||
            !payload.appMakerId ||
            payload.appMakerId === request.appMakerId
          ) {
            request.user = payload;
          }
        } catch {
          // Token invalid on public route, ignore and continue as unauthenticated
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Token otentikasi diperlukan');
    }

    try {
      const secret = this.getSecret();
      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      // Validasi isolasi multi-tenant: jika request terikat appMakerId dan payload juga memuat appMakerId, keduanya harus identik
      if (
        request.appMakerId &&
        payload.appMakerId &&
        payload.appMakerId !== request.appMakerId
      ) {
        throw new UnauthorizedException(
          'Sesi otentikasi tidak valid untuk App Key yang digunakan',
        );
      }

      if (this.prisma) {
        const userId = payload.userId || payload.sub;
        if (userId) {
          if (payload.role === 'MAKER') {
            const maker = await this.prisma.appMaker.findUnique({
              where: { id: userId },
              select: { id: true },
            });
            if (!maker) {
              throw new UnauthorizedException(
                'Sesi otentikasi tidak valid: pengguna sudah tidak aktif',
              );
            }
          } else {
            const user = await this.prisma.user.findUnique({
              where: { id: userId },
              select: { id: true, appMakerId: true, role: true },
            });
            if (!user) {
              throw new UnauthorizedException(
                'Sesi otentikasi tidak valid: pengguna sudah tidak aktif',
              );
            }
          }
        }
      }

      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        'Token otentikasi tidak valid atau telah kedaluwarsa',
      );
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authorization = request.headers['authorization'];
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

