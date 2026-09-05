import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { StatusSetor } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';

describe('SetorSampahController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;
  let jwtService: JwtService;

  const mockAppMaker = {
    id: 'tenant-setor-1',
    appKey: 'app-key-setor-12345',
    email: 'adminsetor@example.com',
    namaSiswa: 'Siswa Setor',
    kelas: 'XII RPL',
    namaApp: 'Bank Sampah Digital',
  };

  const otherAppMaker = {
    id: 'tenant-setor-2',
    appKey: 'app-key-setor-99999',
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
      saldoPoin: 50,
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
      saldoPoin: 100,
    },
  };

  const mockKategori = {
    id: 'kat-1',
    appMakerId: mockAppMaker.id,
    namaKategori: 'Botol Plastik PET',
    poinPerKg: 10,
    hargaPerKg: 3000,
  };

  const mockSetor = {
    id: 'setor-trans-1',
    kodeSetor: 'STR-202609-A1B2',
    appMakerId: mockAppMaker.id,
    nasabahId: mockNasabahUser.nasabah.id,
    tanggal: new Date(),
    totalBeratKg: 5,
    estimasiTotalPoin: 50,
    status: StatusSetor.menunggu_konfirmasi,
    catatan: 'Catatan penyetoran',
    catatanAdmin: null,
    nasabah: mockNasabahUser.nasabah,
    detailSetor: [
      {
        id: 'det-1',
        kategoriSampahId: mockKategori.id,
        beratKg: 5,
        poinPerKg: 10,
        subtotalPoin: 50,
        kategoriSampah: mockKategori,
      },
    ],
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
      },
      kategoriSampah: {
        findFirst: vi.fn().mockImplementation((args: any) => {
          if (args.where.id === mockKategori.id && args.where.appMakerId === mockAppMaker.id) {
            return Promise.resolve(mockKategori);
          }
          return Promise.resolve(null);
        }),
      },
      setorSampah: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      detailSetor: {
        update: vi.fn(),
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

  describe('POST /api/v1/setor-sampah/pengajuan', () => {
    it('should return 401 if x-app-key header is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/setor-sampah/pengajuan')
        .set('Authorization', `Bearer ${nasabahToken}`)
        .send({
          items: [{ kategoriSampahId: mockKategori.id, beratKg: 2 }],
        })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Header x-app-key diperlukan');
    });

    it('should return 403 Forbidden if called by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/setor-sampah/pengajuan')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ kategoriSampahId: mockKategori.id, beratKg: 2 }],
        })
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });

    it('should create pengajuan successfully for NASABAH (201)', async () => {
      prismaMock.setorSampah.create.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'new-setor-1',
          ...args.data,
          nasabah: mockNasabahUser.nasabah,
          detailSetor: args.data.detailSetor.create,
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/setor-sampah/pengajuan')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .send({
          catatan: 'Tolong timbang teliti',
          items: [{ kategoriSampahId: mockKategori.id, beratKg: 3.5 }],
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Pengajuan setor sampah berhasil dibuat');
      expect(res.body.data.totalBeratKg).toBe(3.5);
      expect(res.body.data.estimasiTotalPoin).toBe(35); // 3.5 * 10 = 35
      expect(res.body.data.kodeSetor).toMatch(/^STR-\d{6}-[A-Z0-9]{4}$/);
    });
  });

  describe('GET /api/v1/setor-sampah/my-setor', () => {
    it('should return history of logged-in nasabah (200)', async () => {
      prismaMock.setorSampah.findMany.mockResolvedValue([mockSetor]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/setor-sampah/my-setor?bulan=2026-09')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Histori setor sampah berhasil dimuat');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].id).toBe(mockSetor.id);
    });

    it('should return 403 Forbidden if accessed by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/setor-sampah/my-setor')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/setor-sampah/admin/list', () => {
    it('should return all setor list for ADMIN (200)', async () => {
      prismaMock.setorSampah.findMany.mockResolvedValue([mockSetor]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/setor-sampah/admin/list?status=menunggu_konfirmasi')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Daftar pengajuan setor sampah berhasil dimuat');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 403 Forbidden if accessed by NASABAH', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/setor-sampah/admin/list')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/setor-sampah/:id', () => {
    it('should allow owner NASABAH to view own transaction detail (200)', async () => {
      prismaMock.setorSampah.findFirst.mockResolvedValue(mockSetor);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/setor-sampah/${mockSetor.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.data.id).toBe(mockSetor.id);
      expect(res.body.data.kodeSetor).toBe(mockSetor.kodeSetor);
    });

    it('should allow ADMIN to view any transaction in tenant (200)', async () => {
      prismaMock.setorSampah.findFirst.mockResolvedValue(mockSetor);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/setor-sampah/${mockSetor.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.data.id).toBe(mockSetor.id);
    });

    it('should return 404 if accessed by other NASABAH who does not own it', async () => {
      prismaMock.setorSampah.findFirst.mockResolvedValue(mockSetor);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/setor-sampah/${mockSetor.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${otherNasabahToken}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Data setor sampah tidak ditemukan');
    });
  });

  describe('PUT /api/v1/setor-sampah/admin/verify/:id', () => {
    it('should allow ADMIN to verify and update status to selesai, crediting saldoPoin (200)', async () => {
      prismaMock.setorSampah.findFirst.mockResolvedValue(mockSetor);
      prismaMock.setorSampah.update.mockResolvedValue({
        ...mockSetor,
        status: StatusSetor.selesai,
        totalBeratKgReal: 6,
        totalPoinReal: 60,
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/setor-sampah/admin/verify/${mockSetor.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'selesai',
          catatanAdmin: 'Selesai ditimbang dengan akurat',
          itemsReal: [
            {
              kategoriSampahId: mockKategori.id,
              beratKgReal: 6,
            },
          ],
        })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Verifikasi setor sampah berhasil diproses');
      expect(prismaMock.nasabah.update).toHaveBeenCalledWith({
        where: { id: mockNasabahUser.nasabah.id },
        data: {
          saldoPoin: { increment: 60 },
        },
      });
    });

    it('should return 403 Forbidden if called by NASABAH', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/setor-sampah/admin/verify/${mockSetor.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .send({
          status: 'diverifikasi',
        })
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });

    it('should return 400 Bad Request if status is not valid StatusSetor enum', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/setor-sampah/admin/verify/${mockSetor.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'invalid_status',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validasi data gagal');
    });

    it('should return 404 if setor not found or belongs to different tenant', async () => {
      prismaMock.setorSampah.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .put('/api/v1/setor-sampah/admin/verify/unknown-id')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'selesai',
        })
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Data setor sampah tidak ditemukan');
    });
  });
});
