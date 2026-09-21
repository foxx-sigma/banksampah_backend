import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';

describe('Railway & Frontend Integration Verification', () => {
  let app: INestApplication;
  let prismaMock: any;

  const mockUser = {
    id: 'user-nasabah-123',
    username: 'testnasabah',
    password: '',
    role: 'NASABAH',
    createdAt: new Date(),
    updatedAt: new Date(),
    nasabah: {
      id: 'nasabah-123',
      userId: 'user-nasabah-123',
      namaNasabah: 'Test User',
      alamat: 'Jl. Test',
      telp: '081234567890',
      foto: null,
      saldoPoin: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    adminBank: null,
  };

  beforeEach(async () => {
    mockUser.password = await bcrypt.hash('secret123', 10);

    prismaMock = {
      user: {
        findUnique: vi.fn().mockImplementation((args) => {
          if (args?.where?.username === 'testnasabah' || args?.where?.id === 'user-nasabah-123') {
            return Promise.resolve(mockUser);
          }
          return Promise.resolve(null);
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());

    // Configure CORS exactly as main.ts
    const rawOrigins = 'http://localhost:3000,https://my-frontend.vercel.app';
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

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('AC: Login in production mode sets HttpOnly, Secure, SameSite=Lax without Domain', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'testnasabah',
          password: 'secret123',
        })
        .expect(200);

      const setCookie = res.headers['set-cookie'] as string[];
      expect(setCookie).toBeDefined();

      const accessTokenCookie = setCookie.find((c) => c.startsWith('accessToken='));
      expect(accessTokenCookie).toBeDefined();

      // Check cookie flags
      expect(accessTokenCookie?.toLowerCase()).toContain('httponly');
      expect(accessTokenCookie?.toLowerCase()).toContain('secure');
      expect(accessTokenCookie?.toLowerCase()).toContain('samesite=lax');
      expect(accessTokenCookie?.toLowerCase()).toContain('path=/');
      expect(accessTokenCookie?.toLowerCase()).not.toContain('domain=');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('AC: Preflight OPTIONS from allowed origin returns Access-Control-Allow-Origin matching origin and Access-Control-Allow-Credentials: true', async () => {
    const allowedOrigin = 'http://localhost:3000';

    const res = await request(app.getHttpServer())
      .options('/api/v1/auth/login')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('AC: Preflight OPTIONS from disallowed origin does not return Access-Control-Allow-Origin header', async () => {
    const disallowedOrigin = 'http://unauthorized-evil-site.com';

    const res = await request(app.getHttpServer())
      .options('/api/v1/auth/login')
      .set('Origin', disallowedOrigin)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('AC: Logout clears cookie with matching options (HttpOnly, Secure in prod, SameSite=Lax)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(200);

      const setCookie = res.headers['set-cookie'] as string[];
      expect(setCookie).toBeDefined();

      const accessTokenClear = setCookie.find((c) => c.startsWith('accessToken=;'));
      expect(accessTokenClear).toBeDefined();
      expect(accessTokenClear?.toLowerCase()).toContain('httponly');
      expect(accessTokenClear?.toLowerCase()).toContain('secure');
      expect(accessTokenClear?.toLowerCase()).toContain('samesite=lax');
      expect(accessTokenClear?.toLowerCase()).toContain('path=/');
      expect(accessTokenClear?.toLowerCase()).not.toContain('domain=');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
