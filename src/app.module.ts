import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import {
  PrismaService,
  AppKeyGuard,
  JwtAuthGuard,
  RolesGuard,
  GlobalExceptionFilter,
  TransformInterceptor,
} from './common/index.js';

import { AppMakerModule } from './modules/app-maker/app-maker.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    AppMakerModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'Konfigurasi keamanan gagal: JWT_SECRET belum disetel pada file environment (.env)',
          );
        }
        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
    ...(process.env.OBSERVE_APP_KEY &&
    process.env.OBSERVE_APP_KEY !== 'YOUR_APP_KEY'
      ? [
          ObserveModule.forRoot({
            appKey: process.env.OBSERVE_APP_KEY,
            appSecret: process.env.OBSERVE_APP_SECRET || '',
            serviceId: 'banksampah_backend',
          }),
        ]
      : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: AppKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
