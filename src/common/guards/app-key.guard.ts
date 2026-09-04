import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service.js';
import { SKIP_APP_KEY } from '../decorators/skip-app-key.decorator.js';

@Injectable()
export class AppKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSkipAppKey = this.reflector.getAllAndOverride<boolean>(
      SKIP_APP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isSkipAppKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const appKey =
      request.headers['x-app-key'] || request.headers['X-App-Key'];

    if (!appKey) {
      throw new UnauthorizedException('Header x-app-key diperlukan');
    }

    const appMaker = await this.prisma.appMaker.findUnique({
      where: { appKey: String(appKey) },
    });

    if (!appMaker) {
      throw new UnauthorizedException('Header x-app-key tidak valid');
    }

    request.appMakerId = appMaker.id;
    request.appMaker = appMaker;

    return true;
  }
}
