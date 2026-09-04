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
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  const expressApp = app.getHttpAdapter().getInstance();
  if (expressApp && typeof expressApp.disable === 'function') {
    expressApp.disable('x-powered-by');
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
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

  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin:
      corsOrigin && corsOrigin !== '*'
        ? corsOrigin.split(',').map((o) => o.trim())
        : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-app-key', 'X-App-Key'],
    credentials: true,
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

