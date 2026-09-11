import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { StatusPenukaran } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';

describe('PenukaranPoinController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;
  let jwtService: JwtService;

  const mockAppMaker = {
    id: 'tenant-penukaran-1',
    appKey: 'app-key-penukaran-12345',
    email: 'adminpenukaran@example.com',
    namaSiswa: 'Siswa Penukaran',
    kelas: 'XII RPL',
    namaApp: 'Bank Sampah Digital',
  };

  const otherAppMaker = {
    id: 'tenant-penukaran-2',
    appKey: 'app-key-penukaran-99999',
  };

  let adminToken: string;
  let nasabahToken: string;
  let otherNasabahToken: string;

  const mockNasabahUser = {
    id: 'user-nasabah-1',
    userId: 'user-nasabah-1',
    appMakerId: mockAppMaker.id,
    nasabah: {
      id: 'nasabah-uuid-1',
      userId: 'user-nasabah-1',
      appMakerId: mockAppMaker.id,
      namaNasabah: 'Budi Nasabah',
      alamat: 'Jl. Melati 1',
      telp: '08123456789',
      saldoPoin: 200,
    },
  };

  const otherNasabahUser = {
    id: 'user-nasabah-2',
    userId: 'user-nasabah-2',
    appMakerId: mockAppMaker.id,
    nasabah: {
      id: 'nasabah-uuid-2',
      userId: 'user-nasabah-2',
      appMakerId: mockAppMaker.id,
      namaNasabah: 'Siti Nasabah',
      alamat: 'Jl. Kenanga 2',
      telp: '08987654321',
      saldoPoin: 150,
    },
  };

  const mockHadiah = {
    id: 'hadiah-uuid-1',
    appMakerId: mockAppMaker.id,
    namaHadiah: 'Tumbler Ramah Lingkungan',
    poinDibutuhkan: 100,
    stok: 10,
    foto: 'https://supabase.co/tumbler.jpg',
  };

  const mockPenukaran = {
    id: 'penukaran-uuid-1',
    kodePenukaran: 'TKR-202609-ABCD',
    appMakerId: mockAppMaker.id,
    nasabahId: mockNasabahUser.nasabah.id,
    hadiahId: mockHadiah.id,
    poinDigunakan: 100,
    status: StatusPenukaran.diproses,
    catatan: 'Catatan penukaran',
    tanggal: new Date(),
    nasabah: mockNasabahUser.nasabah,
    hadiah: mockHadiah,
  };

  beforeEach(async () => {
    prismaMock = {
      appMaker: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where.appKey === mockAppMaker.appKey) return Promise.resolve(mockAppMaker);
          if (args.where.appKey === otherAppMaker.appKey) return Promise.resolve(otherAppMaker);
          return Promise.resolve(null);
        }),
      },
      nasabah: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where.userId === mockNasabahUser.id) return Promise.resolve(mockNasabahUser.nasabah);
          if (args.where.userId === otherNasabahUser.id) return Promise.resolve(otherNasabahUser.nasabah);
          return Promise.resolve(null);
        }),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      hadiah: {
        findFirst: vi.fn().mockImplementation((args: any) => {
          if (args.where.id === mockHadiah.id && args.where.appMakerId === mockAppMaker.id) {
            return Promise.resolve(mockHadiah);
          }
          return Promise.resolve(null);
        }),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      penukaranPoin: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where?.id === 'admin-1') {
            return Promise.resolve({ id: 'admin-1', appMakerId: mockAppMaker.id, role: 'ADMIN' });
          }
          if (args.where?.id === mockNasabahUser.id) {
            return Promise.resolve({ id: mockNasabahUser.id, appMakerId: mockAppMaker.id, role: 'NASABAH' });
          }
          if (args.where?.id === otherNasabahUser.id) {
            return Promise.resolve({ id: otherNasabahUser.id, appMakerId: mockAppMaker.id, role: 'NASABAH' });
          }
          return Promise.resolve(null);
        }),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
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
      sub: mockNasabahUser.id,
      userId: mockNasabahUser.id,
      username: 'budinasabah',
      role: 'NASABAH',
      appMakerId: mockAppMaker.id,
    });

    otherNasabahToken = await jwtService.signAsync({
      sub: otherNasabahUser.id,
      userId: otherNasabahUser.id,
      username: 'sitinasabah',
      role: 'NASABAH',
      appMakerId: mockAppMaker.id,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/penukaran-poin/tukar', () => {
    it('should return 401 if x-app-key header is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/penukaran-poin/tukar')
        .set('Authorization', `Bearer ${nasabahToken}`)
        .send({ hadiahId: mockHadiah.id })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Header x-app-key diperlukan');
    });

    it('should return 403 Forbidden if called by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/penukaran-poin/tukar')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hadiahId: mockHadiah.id })
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });

    it('should successfully redeem points for NASABAH (201)', async () => {
      prismaMock.penukaranPoin.create.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'new-penukaran-1',
          ...args.data,
          nasabah: mockNasabahUser.nasabah,
          hadiah: mockHadiah,
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/penukaran-poin/tukar')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .send({
          hadiahId: mockHadiah.id,
          catatan: 'Ambil hari senin',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Penukaran poin berhasil diajukan');
      expect(res.body.data.poinDigunakan).toBe(100);
      expect(res.body.data.kodePenukaran).toMatch(/^TKR-\d{6}-[A-Z0-9]{4}$/);
      expect(prismaMock.nasabah.updateMany).toHaveBeenCalledWith({
        where: {
          id: mockNasabahUser.nasabah.id,
          appMakerId: mockAppMaker.id,
          saldoPoin: { gte: mockHadiah.poinDibutuhkan },
        },
        data: { saldoPoin: { decrement: 100 } },
      });
      expect(prismaMock.hadiah.updateMany).toHaveBeenCalledWith({
        where: {
          id: mockHadiah.id,
          appMakerId: mockAppMaker.id,
          stok: { gte: 1 },
        },
        data: { stok: { decrement: 1 } },
      });
    });

    it('should return 400 Bad Request if saldo poin is insufficient', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue({
        ...mockNasabahUser.nasabah,
        saldoPoin: 30, // needs 100
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/penukaran-poin/tukar')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .send({
          hadiahId: mockHadiah.id,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Saldo poin tidak mencukupi');
    });

    it('should return 400 Bad Request if hadiah stock is exhausted', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue({
        ...mockHadiah,
        stok: 0,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/penukaran-poin/tukar')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .send({
          hadiahId: mockHadiah.id,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Stok hadiah tidak mencukupi');
    });
  });

  describe('GET /api/v1/penukaran-poin/my-penukaran', () => {
    it('should return penukaran history of logged-in nasabah (200)', async () => {
      prismaMock.penukaranPoin.findMany.mockResolvedValue([mockPenukaran]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/penukaran-poin/my-penukaran?bulan=2026-09')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Histori penukaran poin berhasil dimuat');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].id).toBe(mockPenukaran.id);
    });

    it('should return 403 Forbidden if accessed by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/penukaran-poin/my-penukaran')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/penukaran-poin/admin/list', () => {
    it('should return all penukaran list for ADMIN (200)', async () => {
      prismaMock.penukaranPoin.findMany.mockResolvedValue([mockPenukaran]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/penukaran-poin/admin/list?status=diproses')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Daftar transaksi penukaran poin berhasil dimuat');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 403 Forbidden if accessed by NASABAH', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/penukaran-poin/admin/list')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });
  });

  describe('PUT /api/v1/penukaran-poin/admin/status/:id', () => {
    it('should allow ADMIN to update status (200)', async () => {
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(mockPenukaran);
      prismaMock.penukaranPoin.update.mockResolvedValue({
        ...mockPenukaran,
        status: StatusPenukaran.selesai,
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/penukaran-poin/admin/status/${mockPenukaran.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'selesai',
          catatan: 'Hadiah sudah diserahkan',
        })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Status penukaran poin berhasil diperbarui');
      expect(res.body.data.status).toBe(StatusPenukaran.selesai);
    });

    it('should return 403 Forbidden if called by NASABAH', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/penukaran-poin/admin/status/${mockPenukaran.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .send({ status: 'selesai' })
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });

    it('should return 400 Bad Request if status is invalid', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/penukaran-poin/admin/status/${mockPenukaran.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validasi data gagal');
    });
  });

  describe('GET /api/v1/penukaran-poin/nota/:id', () => {
    it('should allow owner NASABAH to view own nota (200)', async () => {
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(mockPenukaran);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/penukaran-poin/nota/${mockPenukaran.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Nota transaksi penukaran poin berhasil dimuat');
      expect(res.body.data.id).toBe(mockPenukaran.id);
      expect(res.body.data.kodePenukaran).toBe(mockPenukaran.kodePenukaran);
    });

    it('should allow ADMIN to view any nota in tenant (200)', async () => {
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(mockPenukaran);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/penukaran-poin/nota/${mockPenukaran.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.data.id).toBe(mockPenukaran.id);
    });

    it('should return 404 if accessed by other NASABAH who does not own it', async () => {
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(mockPenukaran);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/penukaran-poin/nota/${mockPenukaran.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${otherNasabahToken}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Data penukaran poin tidak ditemukan');
    });

    it('should return 404 if nota not found or belongs to different tenant', async () => {
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/penukaran-poin/nota/unknown-id')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Data penukaran poin tidak ditemukan');
    });
  });
});
