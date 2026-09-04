import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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
          const payload = await this.jwtService.verifyAsync(token, {
            secret:
              this.configService.get<string>('JWT_SECRET') ||
              process.env.JWT_SECRET ||
              'eco-waste-management-jwt-secret-2026',
          });
          request.user = payload;
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
      const payload = await this.jwtService.verifyAsync(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          process.env.JWT_SECRET ||
          'eco-waste-management-jwt-secret-2026',
      });

      request.user = payload;
      return true;
    } catch {
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
