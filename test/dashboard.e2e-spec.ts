import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;
  let jwtService: JwtService;

  const mockAppMaker = {
    id: 'tenant-dash-1',
    appKey: 'app-key-dash-12345',
    email: 'admindash@example.com',
    namaSiswa: 'Siswa Dashboard',
    kelas: 'XII RPL',
    namaApp: 'Bank Sampah Digital',
  };

  const mockNasabah = {
    id: 'nasabah-dash-1',
    userId: 'user-nasabah-1',
    appMakerId: mockAppMaker.id,
    namaNasabah: 'Budi Santoso',
    saldoPoin: 1500,
  };

  let adminToken: string;
  let nasabahToken: string;

  beforeEach(async () => {
    prismaMock = {
      appMaker: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where.appKey === mockAppMaker.appKey) return Promise.resolve(mockAppMaker);
          return Promise.resolve(null);
        }),
      },
      nasabah: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where.userId === mockNasabah.userId) return Promise.resolve(mockNasabah);
          return Promise.resolve(null);
        }),
        count: vi.fn(),
      },
      kategoriSampah: {
        count: vi.fn(),
      },
      setorSampah: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
      hadiah: {
        count: vi.fn(),
      },
      penukaranPoin: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where?.id === 'admin-1') {
            return Promise.resolve({ id: 'admin-1', appMakerId: mockAppMaker.id, role: 'ADMIN' });
          }
          if (args.where?.id === mockNasabah.userId) {
            return Promise.resolve({ id: mockNasabah.userId, appMakerId: mockAppMaker.id, role: 'NASABAH' });
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      userId: 'admin-1',
      username: 'admin1',
      role: 'ADMIN',
      appMakerId: mockAppMaker.id,
    });

    nasabahToken = await jwtService.signAsync({
      sub: mockNasabah.userId,
      userId: mockNasabah.userId,
      username: 'budi',
      role: 'NASABAH',
      appMakerId: mockAppMaker.id,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/dashboard/summary', () => {
    it('should return 401 if x-app-key is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Header x-app-key diperlukan');
    });

    it('should return 401 if Authorization header is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/summary')
        .set('x-app-key', mockAppMaker.appKey)
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Token otentikasi diperlukan');
    });

    it('should return 403 Forbidden if accessed by role ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/summary')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toContain('Akses ditolak');
    });

    it('should return summary data successfully for NASABAH (200)', async () => {
      prismaMock.setorSampah.findMany.mockResolvedValue([
        {
          totalBeratKg: 10,
          totalBeratKgReal: 12,
          estimasiTotalPoin: 100,
          totalPoinReal: 120,
        },
      ]);

      prismaMock.penukaranPoin.findMany.mockResolvedValue([
        { poinDigunakan: 200 },
      ]);

      const mockLastSetor = {
        id: 'setor-last',
        totalBeratKg: 12,
        detailSetor: [],
      };
      const mockLastTukar = {
        id: 'tukar-last',
        poinDigunakan: 200,
        hadiah: { namaHadiah: 'Voucher' },
      };

      prismaMock.setorSampah.findFirst.mockResolvedValue(mockLastSetor);
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(mockLastTukar);

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/summary')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Ringkasan dashboard nasabah berhasil diambil');
      expect(res.body.data.saldoPoinSaatIni).toBe(1500);
      expect(res.body.data.totalSampahDisetorKg).toBe(12);
      expect(res.body.data.totalPoinDidapat).toBe(120);
      expect(res.body.data.totalPoinDitukar).toBe(200);
      expect(res.body.data.transaksiTerakhirSetor).toEqual(mockLastSetor);
      expect(res.body.data.transaksiTerakhirTukar).toEqual(mockLastTukar);
    });
  });

  describe('GET /api/v1/dashboard/stats', () => {
    it('should return 401 if x-app-key is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/stats')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Header x-app-key diperlukan');
    });

    it('should return stats successfully with only x-app-key header (200)', async () => {
      prismaMock.nasabah.count.mockResolvedValue(25);
      prismaMock.kategoriSampah.count.mockResolvedValue(6);
      prismaMock.setorSampah.count.mockResolvedValue(40);
      prismaMock.hadiah.count.mockResolvedValue(8);

      prismaMock.setorSampah.findMany.mockResolvedValue([
        {
          totalBeratKg: 50,
          totalBeratKgReal: 55.5,
          estimasiTotalPoin: 1000,
          totalPoinReal: 1110,
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/stats')
        .set('x-app-key', mockAppMaker.appKey)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Statistik dashboard berhasil diambil');
      expect(res.body.data.totalNasabah).toBe(25);
      expect(res.body.data.totalKategoriSampah).toBe(6);
      expect(res.body.data.totalTransaksiSetor).toBe(40);
      expect(res.body.data.totalHadiah).toBe(8);
      expect(res.body.data.totalBeratSampahKg).toBe(55.5);
      expect(res.body.data.totalPoinTersalurkan).toBe(1110);
    });
  });
});
