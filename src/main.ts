import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { AppModule, ObserveInstrument } from './app.module.js';

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection at Promise:', reason?.stack || reason);
});
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception thrown:', error.stack || error);
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  const nasabahUploadDir = join(uploadDir, 'nasabah');
  if (!existsSync(nasabahUploadDir)) {
    mkdirSync(nasabahUploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
    },
  });

  const expressApp = app.getHttpAdapter().getInstance();
  if (expressApp && typeof expressApp.disable === 'function') {
    expressApp.disable('x-powered-by');
  }
  if (expressApp && typeof expressApp.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          scriptSrc: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          objectSrc: ["'none'"],
        },
      },
    }),
  );

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      statusCode: 429,
      success: false,
      message: 'Terlalu banyak permintaan, silakan coba lagi nanti.',
      errors: null,
      timestamp: new Date().toISOString(),
    },
  });
  app.use(limiter);

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      statusCode: 429,
      success: false,
      message:
        'Terlalu banyak percobaan pada endpoint autentikasi, silakan coba lagi nanti.',
      errors: null,
      timestamp: new Date().toISOString(),
    },
  });
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/maker/login', authLimiter);
  app.use('/api/v1/maker/check-key', authLimiter);

  const corsOrigin = process.env.CORS_ORIGIN;
  const isWildcard = !corsOrigin || corsOrigin === '*';
  app.enableCors({
    origin: isWildcard
      ? true
      : corsOrigin.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-app-key', 'X-App-Key'],
    credentials: !isWildcard,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();

