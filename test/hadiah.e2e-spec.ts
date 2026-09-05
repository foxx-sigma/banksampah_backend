import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';
import { StorageService } from '../src/common/storage.service.js';

describe('HadiahController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;
  let storageMock: any;
  let jwtService: JwtService;

  const mockAppMaker = {
    id: 'tenant-maker-1',
    appKey: 'app-key-maker-12345',
    email: 'adminmaker@example.com',
    namaSiswa: 'Siswa Admin',
    kelas: 'XII RPL',
    namaApp: 'Bank Sampah Digital',
  };

  const otherAppMaker = {
    id: 'tenant-maker-2',
    appKey: 'app-key-maker-99999',
  };

  let adminToken: string;
  let nasabahToken: string;

  const mockHadiah = {
    id: 'hadiah-uuid-1',
    appMakerId: mockAppMaker.id,
    namaHadiah: 'Tumbler Stainless Steel',
    deskripsi: 'Tumbler ramah lingkungan 500ml',
    poinDibutuhkan: 250,
    stok: 10,
    foto: 'https://supabase.co/storage/v1/object/public/hadiah/tumbler.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = {
      appMaker: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where.appKey === mockAppMaker.appKey) {
            return Promise.resolve(mockAppMaker);
          }
          if (args.where.appKey === otherAppMaker.appKey) {
            return Promise.resolve(otherAppMaker);
          }
          return Promise.resolve(null);
        }),
      },
      hadiah: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    storageMock = {
      uploadFile: vi.fn().mockResolvedValue('https://supabase.co/storage/v1/object/public/hadiah/uploaded.jpg'),
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
      appMakerId: mockAppMaker.id,
    });

    nasabahToken = await jwtService.signAsync({
      sub: 'nasabah-user-1',
      userId: 'nasabah-user-1',
      username: 'nasabah1',
      role: 'NASABAH',
      appMakerId: mockAppMaker.id,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Guard Protection & Role Authorization', () => {
    it('should return 401 on GET /api/v1/hadiah if x-app-key header is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hadiah')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Header x-app-key diperlukan');
    });

    it('should allow GET /api/v1/hadiah with x-app-key without JWT token (public access) (200)', async () => {
      prismaMock.hadiah.findMany.mockResolvedValue([mockHadiah]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/hadiah')
        .set('x-app-key', mockAppMaker.appKey)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Daftar katalog hadiah berhasil dimuat');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].id).toBe(mockHadiah.id);
    });

    it('should return 401 on POST /api/v1/hadiah if Authorization header is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hadiah')
        .set('x-app-key', mockAppMaker.appKey)
        .field('namaHadiah', 'Tumbler')
        .field('poinDibutuhkan', '100')
        .field('stok', '10')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Token otentikasi diperlukan');
    });

    it('should return 403 Forbidden on POST /api/v1/hadiah if role is NASABAH', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hadiah')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .field('namaHadiah', 'Tumbler')
        .field('poinDibutuhkan', '100')
        .field('stok', '10')
        .expect(403);

      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toContain('Akses ditolak');
    });

    it('should return 403 Forbidden on PUT /api/v1/hadiah/:id if role is NASABAH', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/hadiah/${mockHadiah.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .field('namaHadiah', 'Tumbler Updated')
        .expect(403);

      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toContain('Akses ditolak');
    });

    it('should return 403 Forbidden on DELETE /api/v1/hadiah/:id if role is NASABAH', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/hadiah/${mockHadiah.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toContain('Akses ditolak');
    });
  });

  describe('Validation', () => {
    it('should return 400 if required fields are missing on POST /api/v1/hadiah', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hadiah')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('deskripsi', 'Hanya deskripsi')
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validasi data gagal');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Nama hadiah tidak boleh kosong'),
          expect.stringContaining('Poin dibutuhkan harus berupa angka bulat'),
          expect.stringContaining('Stok harus berupa angka bulat'),
        ]),
      );
    });

    it('should return 400 if poinDibutuhkan is negative', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hadiah')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('namaHadiah', 'Piring Cantik')
        .field('poinDibutuhkan', '-10')
        .field('stok', '5')
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Poin dibutuhkan minimal 0'),
        ]),
      );
    });
  });

  describe('POST /api/v1/hadiah (multipart/form-data)', () => {
    it('should create new hadiah with photo upload as ADMIN (201)', async () => {
      prismaMock.hadiah.create.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'new-hadiah-uuid',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/hadiah')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('namaHadiah', 'Payung Lipat Eco')
        .field('deskripsi', 'Payung lipat praktis')
        .field('poinDibutuhkan', '150')
        .field('stok', '25')
        .attach('foto', Buffer.from('fake image content'), 'payung.jpg')
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Hadiah berhasil ditambahkan');
      expect(res.body.data.namaHadiah).toBe('Payung Lipat Eco');
      expect(res.body.data.poinDibutuhkan).toBe(150);
      expect(res.body.data.stok).toBe(25);
      expect(res.body.data.appMakerId).toBe(mockAppMaker.id);
      expect(storageMock.uploadFile).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/hadiah/:id', () => {
    it('should return detail of hadiah if found (200)', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue(mockHadiah);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/hadiah/${mockHadiah.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Detail hadiah berhasil dimuat');
      expect(res.body.data.id).toBe(mockHadiah.id);
      expect(res.body.data.namaHadiah).toBe(mockHadiah.namaHadiah);
    });

    it('should return 404 if hadiah not found or belongs to another tenant', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/hadiah/non-existent-id')
        .set('x-app-key', mockAppMaker.appKey)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Data hadiah tidak ditemukan');
    });
  });

  describe('PUT /api/v1/hadiah/:id (multipart/form-data)', () => {
    it('should update hadiah as ADMIN (200)', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue(mockHadiah);
      prismaMock.hadiah.update.mockResolvedValue({
        ...mockHadiah,
        namaHadiah: 'Tumbler Updated',
        poinDibutuhkan: 300,
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/hadiah/${mockHadiah.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('namaHadiah', 'Tumbler Updated')
        .field('poinDibutuhkan', '300')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Hadiah berhasil diperbarui');
      expect(res.body.data.namaHadiah).toBe('Tumbler Updated');
      expect(res.body.data.poinDibutuhkan).toBe(300);
    });
  });

  describe('DELETE /api/v1/hadiah/:id', () => {
    it('should delete hadiah as ADMIN (200)', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue(mockHadiah);
      prismaMock.hadiah.delete.mockResolvedValue(mockHadiah);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/hadiah/${mockHadiah.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Hadiah berhasil dihapus');
      expect(res.body.data).toEqual({ id: mockHadiah.id, deleted: true });
      expect(storageMock.deleteFile).toHaveBeenCalledWith(mockHadiah.foto);
    });
  });
});
