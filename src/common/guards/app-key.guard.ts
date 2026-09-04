import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service.js';
import { SKIP_APP_KEY } from '../decorators/skip-app-key.decorator.js';

interface CacheEntry {
  appMaker: any;
  expiresAt: number;
}

@Injectable()
export class AppKeyGuard implements CanActivate {
  private static readonly cache = new Map<string, CacheEntry>();
  private static readonly TTL_MS = 60 * 1000;

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

    const appKeyStr = String(appKey);
    const now = Date.now();
    const cached = AppKeyGuard.cache.get(appKeyStr);

    let appMaker: any;
    if (cached && cached.expiresAt > now) {
      appMaker = cached.appMaker;
    } else {
      appMaker = await this.prisma.appMaker.findUnique({
        where: { appKey: appKeyStr },
      });

      if (!appMaker) {
        throw new UnauthorizedException('Header x-app-key tidak valid');
      }

      AppKeyGuard.cache.set(appKeyStr, {
        appMaker,
        expiresAt: now + AppKeyGuard.TTL_MS,
      });

      if (AppKeyGuard.cache.size > 1000) {
        const firstKey = AppKeyGuard.cache.keys().next().value;
        if (firstKey) {
          AppKeyGuard.cache.delete(firstKey);
        }
      }
    }

    request.appMakerId = appMaker.id;
    request.appMaker = appMaker;

    return true;
  }
}
