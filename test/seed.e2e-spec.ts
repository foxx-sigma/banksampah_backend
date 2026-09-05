import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';

describe('SeedController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  const mockAppMaker = {
    id: 'tenant-seed-1',
    appKey: 'app-key-seed-12345',
    email: 'adminseed@example.com',
    namaSiswa: 'Siswa Seed',
    kelas: 'XII RPL',
    namaApp: 'Bank Sampah Digital',
  };

  beforeEach(async () => {
    const txMock = {
      detailSetor: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      setorSampah: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'setor-1' }),
      },
      penukaranPoin: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'tukar-1' }),
      },
      hadiah: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        create: vi.fn().mockResolvedValue({ id: 'hadiah-1' }),
      },
      kategoriSampah: {
        deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
        create: vi.fn().mockResolvedValue({ id: 'kat-1' }),
      },
      nasabah: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      adminBank: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        create: vi.fn().mockImplementation((args: any) => {
          if (args.data.role === 'ADMIN') {
            return Promise.resolve({
              id: 'user-admin',
              username: args.data.username,
              role: args.data.role,
              adminBank: { namaUnit: 'Bank Sampah Unit Berkah' },
            });
          }
          return Promise.resolve({
            id: `user-${args.data.username}`,
            username: args.data.username,
            role: args.data.role,
            nasabah: {
              id: `nasabah-${args.data.username}`,
              namaNasabah: args.data.nasabah?.create?.namaNasabah,
              saldoPoin: args.data.nasabah?.create?.saldoPoin,
            },
          });
        }),
      },
    };

    prismaMock = {
      appMaker: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where.appKey === mockAppMaker.appKey) return Promise.resolve(mockAppMaker);
          return Promise.resolve(null);
        }),
      },
      $transaction: vi.fn().mockImplementation((cb: any) => cb(txMock)),
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

  describe('POST /api/v1/seed', () => {
    it('should return 401 if x-app-key header is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/seed')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Header x-app-key diperlukan');
    });

    it('should return 401 if x-app-key is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/seed')
        .set('x-app-key', 'invalid-key')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Header x-app-key tidak valid');
    });

    it('should successfully seed data with valid x-app-key and return credentials (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/seed')
        .set('x-app-key', mockAppMaker.appKey)
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Data seed berhasil di-generate');

      // Validate credentials returned
      expect(res.body.data.kredensial).toBeDefined();
      expect(res.body.data.kredensial.admin.username).toBe('admin_bank');
      expect(res.body.data.kredensial.admin.password).toBe('password123');
      expect(res.body.data.kredensial.admin.role).toBe('ADMIN');

      expect(res.body.data.kredensial.nasabah).toHaveLength(2);
      expect(res.body.data.kredensial.nasabah[0].username).toBe('nasabah1');
      expect(res.body.data.kredensial.nasabah[0].password).toBe('password123');
      expect(res.body.data.kredensial.nasabah[0].role).toBe('NASABAH');
      expect(res.body.data.kredensial.nasabah[1].username).toBe('nasabah2');
      expect(res.body.data.kredensial.nasabah[1].password).toBe('password123');
      expect(res.body.data.kredensial.nasabah[1].role).toBe('NASABAH');

      // Validate summary data
      expect(res.body.data.ringkasanData).toEqual({
        totalAdmin: 1,
        totalNasabah: 2,
        totalKategoriSampah: 4,
        totalHadiah: 3,
        totalTransaksiSetor: 1,
        totalTransaksiPenukaran: 1,
      });
    });
  });
});
