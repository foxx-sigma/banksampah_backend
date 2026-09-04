import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';

describe('AppMakerController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  const mockMaker = {
    id: 'maker-uuid-1',
    email: 'siswa@example.com',
    password: '',
    namaSiswa: 'Budi Santoso',
    kelas: 'XII RPL 1',
    namaApp: 'Bank Sampah Digital',
    appKey: 'valid-app-key-12345',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockMaker.password = await bcrypt.hash('secret123', 10);

    prismaMock = {
      appMaker: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      nasabah: {
        count: vi.fn().mockResolvedValue(10),
      },
      kategoriSampah: {
        count: vi.fn().mockResolvedValue(5),
      },
      setorSampah: {
        count: vi.fn().mockResolvedValue(25),
      },
      hadiah: {
        count: vi.fn().mockResolvedValue(4),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
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

  describe('POST /api/v1/maker/register', () => {
    it('should register a new AppMaker successfully (201)', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue(null);
      prismaMock.appMaker.create.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'new-maker-id',
          email: args.data.email,
          namaSiswa: args.data.namaSiswa,
          kelas: args.data.kelas,
          namaApp: args.data.namaApp,
          appKey: args.data.appKey,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/maker/register')
        .send({
          email: 'budi@example.com',
          password: 'password123',
          namaSiswa: 'Budi Santoso',
          kelas: 'XII RPL 1',
          namaApp: 'Bank Sampah Budi',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registrasi App Maker berhasil');
      expect(res.body.data.email).toBe('budi@example.com');
      expect(res.body.data.appKey).toBeDefined();
      expect(res.body.data.password).toBeUndefined();
    });

    it('should return 400 when validation fails (e.g. password < 6 chars)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/maker/register')
        .send({
          email: 'budi@example.com',
          password: '123',
          namaSiswa: 'Budi',
          kelas: 'XII',
          namaApp: 'App',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validasi data gagal');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.timestamp).toBeDefined();
    });

    it('should return 409 Conflict if email is already registered', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue(mockMaker);

      const res = await request(app.getHttpServer())
        .post('/api/v1/maker/register')
        .send({
          email: mockMaker.email,
          password: 'password123',
          namaSiswa: 'Budi Santoso',
          kelas: 'XII RPL 1',
          namaApp: 'Bank Sampah Budi',
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email sudah terdaftar');
    });
  });

  describe('POST /api/v1/maker/login', () => {
    it('should login successfully with correct credentials (200)', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue(mockMaker);

      const res = await request(app.getHttpServer())
        .post('/api/v1/maker/login')
        .send({
          email: 'siswa@example.com',
          password: 'secret123',
        })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login App Maker berhasil');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.appKey).toBe(mockMaker.appKey);
      expect(res.body.data.maker.email).toBe('siswa@example.com');
    });

    it('should return 401 when password is wrong', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue(mockMaker);

      const res = await request(app.getHttpServer())
        .post('/api/v1/maker/login')
        .send({
          email: 'siswa@example.com',
          password: 'wrongPassword',
        })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email atau password salah');
    });
  });

  describe('GET /api/v1/maker/profile', () => {
    it('should return 401 if x-app-key header is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/maker/profile')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Header x-app-key diperlukan');
    });

    it('should return profile and stats when valid x-app-key header is sent (200)', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue(mockMaker);

      const res = await request(app.getHttpServer())
        .get('/api/v1/maker/profile')
        .set('x-app-key', mockMaker.appKey)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Profil App Maker berhasil dimuat');
      expect(res.body.data.email).toBe(mockMaker.email);
      expect(res.body.data.appKey).toBe(mockMaker.appKey);
      expect(res.body.data.totalNasabah).toBe(10);
      expect(res.body.data.totalKategoriSampah).toBe(5);
      expect(res.body.data.totalTransaksiSetor).toBe(25);
      expect(res.body.data.totalHadiah).toBe(4);
      expect(res.body.data.statistik).toEqual({
        totalNasabah: 10,
        totalKategoriSampah: 5,
        totalTransaksiSetor: 25,
        totalHadiah: 4,
      });
    });
  });

  describe('GET /api/v1/maker/check-key', () => {
    it('should return 400 when ?email query param is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/maker/check-key')
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validasi data gagal');
    });

    it('should return 404 when email is not found', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/maker/check-key?email=notfound@example.com')
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe(
        'App Maker dengan email tersebut tidak ditemukan',
      );
    });

    it('should return appKey when email exists (200)', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue(mockMaker);

      const res = await request(app.getHttpServer())
        .get('/api/v1/maker/check-key?email=siswa@example.com')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('App Key berhasil ditemukan');
      expect(res.body.data.email).toBe('siswa@example.com');
      expect(res.body.data.appKey).toBe(mockMaker.appKey);
      expect(res.body.data.namaSiswa).toBe('Budi Santoso');
      expect(res.body.data.namaApp).toBe('Bank Sampah Digital');
    });
  });
});
