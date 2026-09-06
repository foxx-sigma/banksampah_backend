import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient({
  log: ['warn', 'error'],
});

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private static connected = false;

  constructor() {
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        return Reflect.get(globalPrisma, prop);
      },
    });
  }

  async onModuleInit() {
    if (!PrismaService.connected) {
      PrismaService.connected = true;
      try {
        console.log('[PrismaService] Connecting to database...');
        await globalPrisma.$connect();
        console.log('[PrismaService] Connected to database successfully.');
      } catch (err: any) {
        console.warn('[PrismaService] Pre-connect warning:', err?.message || err);
      }
    }
  }

  async onModuleDestroy() {
    if (PrismaService.connected) {
      PrismaService.connected = false;
      await globalPrisma.$disconnect();
    }
  }
}

export interface PrismaService extends PrismaClient {}
