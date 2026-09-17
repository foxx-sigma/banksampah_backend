import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { JenisSampah } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';
import { StorageService } from '../src/common/storage.service.js';

describe('KategoriSampahController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;
  let storageMock: any;
  let jwtService: JwtService;

  let adminToken: string;
  let nasabahToken: string;

  const mockKategori = {
    id: 'kategori-uuid-1',
    namaKategori: 'Botol Plastik PET',
    hargaPerKg: 3000,
    poinPerKg: 10,
    jenis: JenisSampah.plastik,
    foto: 'https://supabase.co/storage/v1/object/public/kategori-sampah/botol.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = {
      kategoriSampah: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where?.id === 'admin-user-1') {
            return Promise.resolve({ id: 'admin-user-1', role: 'ADMIN' });
          }
          if (args.where?.id === 'nasabah-user-1') {
            return Promise.resolve({ id: 'nasabah-user-1', role: 'NASABAH' });
          }
          return Promise.resolve(null);
        }),
      },
    };

    storageMock = {
      uploadFile: vi.fn().mockResolvedValue('https://supabase.co/storage/v1/object/public/kategori-sampah/uploaded.jpg'),
      deleteFile: vi.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(StorageService)
      .useValue(storageMock)
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
      sub: 'admin-user-1',
      userId: 'admin-user-1',
      username: 'admin1',
      role: 'ADMIN',
    });

    nasabahToken = await jwtService.signAsync({
      sub: 'nasabah-user-1',
      userId: 'nasabah-user-1',
      username: 'nasabah1',
      role: 'NASABAH',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Guard Protection & Role Authorization', () => {
    it('should allow GET /api/v1/kategori-sampah without JWT token (public/nasabah access) (200)', async () => {
      prismaMock.kategoriSampah.findMany.mockResolvedValue([mockKategori]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/kategori-sampah')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Daftar kategori sampah berhasil dimuat');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].id).toBe(mockKategori.id);
    });

    it('should return 401 on POST /api/v1/kategori-sampah if Authorization header is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/kategori-sampah')
        .send({
          namaKategori: 'Kardus',
          hargaPerKg: 1000,
          poinPerKg: 2,
          jenis: 'kertas',
        })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Token otentikasi diperlukan');
    });

    it('should return 403 Forbidden on POST /api/v1/kategori-sampah if role is NASABAH', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/kategori-sampah')
        .set('Authorization', `Bearer ${nasabahToken}`)
        .send({
          namaKategori: 'Kardus',
          hargaPerKg: 1000,
          poinPerKg: 2,
          jenis: 'kertas',
        })
        .expect(403);

      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toContain('Akses ditolak');
    });
  });

  describe('Validation', () => {
    it('should return 400 if jenis is not in enum (plastik, kertas, logam, kaca)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/kategori-sampah')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          namaKategori: 'Meja Kayu',
          hargaPerKg: 5000,
          poinPerKg: 10,
          jenis: 'kayu', // invalid
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validasi data gagal');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Jenis sampah harus salah satu dari: plastik, kertas, logam, kaca'),
        ]),
      );
    });
  });

  describe('POST /api/v1/kategori-sampah', () => {
    it('should create new kategori sampah with photo upload as ADMIN (201)', async () => {
      prismaMock.kategoriSampah.create.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'new-kategori-id',
          namaKategori: args.data.namaKategori,
          hargaPerKg: args.data.hargaPerKg,
          poinPerKg: args.data.poinPerKg,
          jenis: args.data.jenis,
          foto: args.data.foto,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/kategori-sampah')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('namaKategori', 'Kardus Box')
        .field('hargaPerKg', '1500')
        .field('poinPerKg', '5')
        .field('jenis', 'kertas')
        .attach('foto', Buffer.from('fake image'), {
          filename: 'kardus.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Kategori sampah berhasil ditambahkan');
      expect(res.body.data.namaKategori).toBe('Kardus Box');
      expect(res.body.data.hargaPerKg).toBe(1500);
      expect(res.body.data.poinPerKg).toBe(5);
      expect(res.body.data.jenis).toBe('kertas');
      expect(storageMock.uploadFile).toHaveBeenCalledWith(
        'kategori-sampah',
        expect.anything(),
      );
    });
  });

  describe('GET /api/v1/kategori-sampah/:id', () => {
    it('should return detail of kategori sampah (200)', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(mockKategori);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/kategori-sampah/${mockKategori.id}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Detail kategori sampah berhasil dimuat');
      expect(res.body.data.id).toBe(mockKategori.id);
      expect(res.body.data.namaKategori).toBe('Botol Plastik PET');
    });

    it('should return 404 if category not found', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/kategori-sampah/other-tenant-id')
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Data kategori sampah tidak ditemukan');
    });
  });

  describe('PUT /api/v1/kategori-sampah/:id', () => {
    it('should update kategori sampah as ADMIN (200)', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(mockKategori);
      prismaMock.kategoriSampah.update.mockResolvedValue({
        ...mockKategori,
        namaKategori: 'Botol PET Bening',
        hargaPerKg: 3500,
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/kategori-sampah/${mockKategori.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          namaKategori: 'Botol PET Bening',
          hargaPerKg: 3500,
        })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Kategori sampah berhasil diperbarui');
      expect(res.body.data.namaKategori).toBe('Botol PET Bening');
    });

    it('should return 404 if updating kategori not found', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .put('/api/v1/kategori-sampah/foreign-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          namaKategori: 'Hacked',
        })
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Data kategori sampah tidak ditemukan');
    });
  });

  describe('DELETE /api/v1/kategori-sampah/:id', () => {
    it('should delete kategori sampah as ADMIN (200)', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(mockKategori);
      prismaMock.kategoriSampah.delete.mockResolvedValue(mockKategori);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/kategori-sampah/${mockKategori.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Kategori sampah berhasil dihapus');
      expect(res.body.data).toEqual({ id: mockKategori.id, deleted: true });
    });

    it('should return 404 if deleting kategori not found', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete('/api/v1/kategori-sampah/foreign-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Data kategori sampah tidak ditemukan');
    });
  });
});
