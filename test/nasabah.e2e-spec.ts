import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';
import { StorageService } from '../src/common/storage.service.js';

describe('NasabahController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;
  let storageMock: any;
  let jwtService: JwtService;

  const mockAppMaker = {
    id: 'tenant-admin-1',
    appKey: 'app-key-admin-12345',
    email: 'adminmaker@example.com',
    namaSiswa: 'Siswa Admin',
    kelas: 'XII RPL',
    namaApp: 'Bank Sampah Digital',
  };

  const otherAppMaker = {
    id: 'tenant-other-9',
    appKey: 'app-key-other-99999',
  };

  let adminToken: string;
  let nasabahToken: string;

  const mockNasabah = {
    id: 'nasabah-id-1',
    appMakerId: mockAppMaker.id,
    userId: 'user-nasabah-1',
    namaNasabah: 'Budi Santoso',
    alamat: 'Jl. Melati No. 1',
    telp: '08123456789',
    tanggalLahir: new Date('1990-01-01'),
    foto: '/uploads/nasabah/test.jpg',
    saldoPoin: 150,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-nasabah-1',
      username: 'budisantoso',
      role: 'NASABAH',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
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
      user: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where?.id === 'admin-user-1') {
            return Promise.resolve({ id: 'admin-user-1', appMakerId: mockAppMaker.id, role: 'ADMIN' });
          }
          if (args.where?.id === 'nasabah-user-1') {
            return Promise.resolve({ id: 'nasabah-user-1', appMakerId: mockAppMaker.id, role: 'NASABAH' });
          }
          return Promise.resolve(null);
        }),
        create: vi.fn(),
        delete: vi.fn(),
      },
      nasabah: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };

    storageMock = {
      uploadFile: vi.fn().mockResolvedValue('https://supabase.co/foto.jpg'),
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
    it('should return 401 if x-app-key header is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/nasabah')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Header x-app-key diperlukan');
    });

    it('should return 401 if Authorization header is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/nasabah')
        .set('x-app-key', mockAppMaker.appKey)
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Token otentikasi diperlukan');
    });

    it('should return 403 Forbidden if user role is not ADMIN (e.g. NASABAH)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/nasabah')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${nasabahToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toContain('Akses ditolak');
    });
  });

  describe('GET /api/v1/admin/nasabah', () => {
    it('should return list of nasabah in caller tenant (200)', async () => {
      prismaMock.nasabah.findMany.mockResolvedValue([mockNasabah]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/nasabah')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Daftar data nasabah berhasil dimuat');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(mockNasabah.id);
      expect(res.body.data[0].user.username).toBe('budisantoso');
    });
  });

  describe('POST /api/v1/admin/nasabah', () => {
    it('should create new nasabah with photo upload (201)', async () => {
      prismaMock.user.findUnique.mockImplementation((args: any) => {
        if (args.where?.id === 'admin-user-1') {
          return Promise.resolve({ id: 'admin-user-1', appMakerId: mockAppMaker.id, role: 'ADMIN' });
        }
        return Promise.resolve(null);
      });
      prismaMock.user.create.mockResolvedValue({
        id: 'new-user-id',
        username: 'sitirahma',
        role: 'NASABAH',
        appMakerId: mockAppMaker.id,
      });
      prismaMock.nasabah.create.mockResolvedValue({
        id: 'new-nasabah-id',
        appMakerId: mockAppMaker.id,
        userId: 'new-user-id',
        namaNasabah: 'Siti Rahma',
        alamat: 'Jl. Anggrek 12',
        telp: '081234567890',
        foto: 'https://supabase.co/foto.jpg',
        saldoPoin: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'new-user-id',
          username: 'sitirahma',
          role: 'NASABAH',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/nasabah')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('username', 'sitirahma')
        .field('password', 'password123')
        .field('namaNasabah', 'Siti Rahma')
        .field('alamat', 'Jl. Anggrek 12')
        .field('telp', '081234567890')
        .attach('foto', Buffer.from('fake image'), {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Data nasabah berhasil ditambahkan');
      expect(res.body.data.id).toBe('new-nasabah-id');
      expect(res.body.data.user.username).toBe('sitirahma');
      expect(storageMock.uploadFile).toHaveBeenCalled();
    });

    it('should return 409 Conflict if username already registered in tenant', async () => {
      prismaMock.user.findUnique.mockImplementation((args: any) => {
        if (args.where?.id === 'admin-user-1') {
          return Promise.resolve({ id: 'admin-user-1', appMakerId: mockAppMaker.id, role: 'ADMIN' });
        }
        if (args.where?.appMakerId_username) {
          return Promise.resolve({ id: 'existing-user' });
        }
        return Promise.resolve(null);
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/nasabah')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'budisantoso',
          password: 'password123',
          namaNasabah: 'Budi Santoso',
          alamat: 'Jl. Melati No. 1',
          telp: '08123456789',
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Username sudah terdaftar pada Bank Sampah ini');
    });
  });

  describe('GET /api/v1/admin/nasabah/:id', () => {
    it('should return detail of nasabah when caller has matching tenant (200)', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(mockNasabah);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/nasabah/${mockNasabah.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Detail data nasabah berhasil dimuat');
      expect(res.body.data.id).toBe(mockNasabah.id);
      expect(res.body.data.namaNasabah).toBe('Budi Santoso');
    });

    it('should return 404 if nasabah not found or belongs to different tenant', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/nasabah/unknown-id')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Data nasabah tidak ditemukan');
    });
  });

  describe('PUT /api/v1/admin/nasabah/:id', () => {
    it('should update nasabah data successfully (200)', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(mockNasabah);
      prismaMock.nasabah.update.mockResolvedValue({
        ...mockNasabah,
        namaNasabah: 'Budi Updated',
        telp: '08999888777',
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/admin/nasabah/${mockNasabah.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          namaLengkap: 'Budi Updated',
          noTelepon: '08999888777',
          alamat: 'Jl. Melati Baru',
        })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Data nasabah berhasil diperbarui');
      expect(res.body.data.namaNasabah).toBe('Budi Updated');
    });

    it('should return 404 if nasabah to update is not in caller tenant', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .put('/api/v1/admin/nasabah/foreign-tenant-id')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          namaLengkap: 'Hacked Name',
        })
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Data nasabah tidak ditemukan');
    });
  });

  describe('DELETE /api/v1/admin/nasabah/:id', () => {
    it('should delete nasabah in caller tenant (200)', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(mockNasabah);
      prismaMock.nasabah.delete.mockResolvedValue(mockNasabah);
      prismaMock.user.delete.mockResolvedValue(mockNasabah.user);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/admin/nasabah/${mockNasabah.id}`)
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Data nasabah berhasil dihapus');
      expect(res.body.data).toEqual({ id: mockNasabah.id, deleted: true });
    });

    it('should return 404 if nasabah to delete is not in caller tenant', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete('/api/v1/admin/nasabah/foreign-id')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Data nasabah tidak ditemukan');
    });
  });
});
