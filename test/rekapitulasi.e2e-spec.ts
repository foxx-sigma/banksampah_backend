import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { JenisSampah } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';

describe('RekapitulasiController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;
  let jwtService: JwtService;

  let adminToken: string;
  let nasabahToken: string;

  beforeEach(async () => {
    prismaMock = {
      setorSampah: {
        findMany: vi.fn(),
      },
      penukaranPoin: {
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where?.id === 'admin-1') {
            return Promise.resolve({ id: 'admin-1', role: 'ADMIN' });
          }
          if (args.where?.id === 'nasabah-1') {
            return Promise.resolve({ id: 'nasabah-1', role: 'NASABAH' });
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
    });

    nasabahToken = await jwtService.signAsync({
      sub: 'nasabah-1',
      userId: 'nasabah-1',
      username: 'nasabah1',
      role: 'NASABAH',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/rekapitulasi/bulanan', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rekapitulasi/bulanan?bulan=2026-09')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Token otentikasi diperlukan');
    });

    it('should return 403 Forbidden if accessed by role NASABAH', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rekapitulasi/bulanan?bulan=2026-09')
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toContain('Akses ditolak');
    });

    it('should return 400 Bad Request if bulan query parameter is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rekapitulasi/bulanan')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validasi data gagal');
    });

    it('should return 400 Bad Request if bulan query parameter has invalid format', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rekapitulasi/bulanan?bulan=2026-9')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validasi data gagal');
    });

    it('should return monthly summary aggregation successfully for ADMIN (200)', async () => {
      prismaMock.setorSampah.findMany.mockResolvedValue([
        {
          id: 'setor-1',
          status: 'selesai',
          tanggal: new Date('2026-09-15'),
          detailSetor: [
            {
              beratKg: 20,
              beratKgReal: 20,
              subtotalPoin: 200,
              subtotalPoinReal: 200,
              kategoriSampah: {
                jenis: JenisSampah.plastik,
                hargaPerKg: 3000,
              },
            },
            {
              beratKg: 10,
              beratKgReal: 10,
              subtotalPoin: 50,
              subtotalPoinReal: 50,
              kategoriSampah: {
                jenis: JenisSampah.kertas,
                hargaPerKg: 1500,
              },
            },
          ],
        },
      ]);

      prismaMock.penukaranPoin.findMany.mockResolvedValue([
        {
          id: 'tukar-1',
          status: 'selesai',
          poinDigunakan: 150,
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/rekapitulasi/bulanan?bulan=2026-09')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Rekapitulasi bulanan berhasil dimuat');
      expect(res.body.data.bulan).toBe('2026-09');

      // Check rekapitulasiTonase
      expect(res.body.data.rekapitulasiTonase.totalKg).toBe(30);
      expect(res.body.data.rekapitulasiTonase.totalTon).toBe(0.03);
      expect(res.body.data.rekapitulasiTonase.totalEstimasiPembayaranRupiah).toBe(
        20 * 3000 + 10 * 1500, // 60000 + 15000 = 75000
      );
      expect(res.body.data.rekapitulasiTonase.totalPoinDiterbitkan).toBe(250);

      // Check breakdownJenisSampah
      expect(res.body.data.breakdownJenisSampah.plastik).toEqual({
        tonaseKg: 20,
        rupiah: 60000,
        poin: 200,
      });
      expect(res.body.data.breakdownJenisSampah.kertas).toEqual({
        tonaseKg: 10,
        rupiah: 15000,
        poin: 50,
      });
      expect(res.body.data.breakdownJenisSampah.logam).toEqual({
        tonaseKg: 0,
        rupiah: 0,
        poin: 0,
      });
      expect(res.body.data.breakdownJenisSampah.kaca).toEqual({
        tonaseKg: 0,
        rupiah: 0,
        poin: 0,
      });

      // Check rekapitulasiPenukaranPoin
      expect(
        res.body.data.rekapitulasiPenukaranPoin.totalTransaksiPenukaran,
      ).toBe(1);
      expect(res.body.data.rekapitulasiPenukaranPoin.totalPoinTerpakai).toBe(
        150,
      );
    });
  });
});
