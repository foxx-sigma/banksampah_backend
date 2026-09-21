import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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
  app.set('trust proxy', 1);

  app.use(cookieParser());

  const isProduction = process.env.NODE_ENV === 'production';

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
          styleSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
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

  const rawOrigins =
    process.env.FRONTEND_URLS || process.env.CORS_ORIGIN || 'http://localhost:3000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0 && o !== '*');

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (!isProduction || process.env.ENABLE_SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Bank Sampah Digital API')
      .setDescription(
        'Dokumentasi OpenAPI / Swagger untuk backend Bank Sampah Digital. Menyediakan endpoints registrasi & autentikasi (Admin & Nasabah), manajemen data nasabah, katalog jenis sampah, pengajuan & verifikasi setoran sampah, katalog hadiah reward, penukaran poin, rekapitulasi bulanan, dasbor, dan seeding data.',
      )
      .setVersion('0.0.1')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Masukkan JWT Token (tanpa prefix Bearer) yang diperoleh setelah login',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Registrasi dan otentikasi login nasabah dan admin bank sampah')
      .addTag('Admin Nasabah', 'Manajemen data nasabah oleh admin bank sampah')
      .addTag('Kategori Sampah', 'Katalog kategori jenis sampah, harga, dan poin per kg')
      .addTag('Setor Sampah', 'Pengajuan dan verifikasi transaksi penyetoran sampah')
      .addTag('Hadiah', 'Katalog hadiah reward penukaran poin')
      .addTag('Penukaran Poin', 'Pengajuan, pemrosesan, dan nota penukaran poin hadiah')
      .addTag('Rekapitulasi', 'Laporan rekapitulasi transaksi bulanan')
      .addTag('Dashboard', 'Statistik dan ringkasan dasbor nasabah maupun agregat')
      .addTag('Seed', 'Inisialisasi data dummy untuk kemudahan pengujian')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: 'Bank Sampah Digital API Docs',
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  console.log(`[main] Calling app.listen on port ${port} (0.0.0.0)...`);
  await app.listen(port, '0.0.0.0');
  console.log(`[main] Server is running on http://0.0.0.0:${port}`);
}
await bootstrap();

