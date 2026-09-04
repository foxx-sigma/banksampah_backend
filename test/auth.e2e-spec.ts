import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  const mockAppMaker = {
    id: 'tenant-uuid-1',
    appKey: 'test-app-key-12345',
    email: 'maker@example.com',
    namaSiswa: 'Siswa Satu',
    kelas: 'XII RPL',
    namaApp: 'Bank Sampah Digital',
  };

  const mockNasabahUser = {
    id: 'user-nasabah-1',
    appMakerId: mockAppMaker.id,
    username: 'nasabah1',
    password: '',
    role: 'NASABAH',
    createdAt: new Date(),
    updatedAt: new Date(),
    nasabah: {
      id: 'nasabah-profile-1',
      appMakerId: mockAppMaker.id,
      userId: 'user-nasabah-1',
      namaNasabah: 'Budi Santoso',
      alamat: 'Jl. Melati',
      telp: '08123456789',
      foto: null,
      saldoPoin: 150,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    adminBank: null,
  };

  beforeEach(async () => {
    mockNasabahUser.password = await bcrypt.hash('secret123', 10);

    prismaMock = {
      appMaker: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args.where.appKey === mockAppMaker.appKey) {
            return Promise.resolve(mockAppMaker);
          }
          return Promise.resolve(null);
        }),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      nasabah: {
        create: vi.fn(),
      },
      adminBank: {
        create: vi.fn(),
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
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/nasabah/register', () => {
    it('should return 401 if x-app-key is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/nasabah/register')
        .send({
          username: 'budi',
          password: 'password123',
          namaNasabah: 'Budi',
          alamat: 'Jl. Merdeka',
          telp: '081234567',
        })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Header x-app-key diperlukan');
    });

    it('should return 400 if validation fails (e.g. password < 6 chars)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/nasabah/register')
        .set('x-app-key', mockAppMaker.appKey)
        .send({
          username: 'budi',
          password: '123',
          namaNasabah: 'Budi',
          alamat: 'Jl. Merdeka',
          telp: '081234567',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Validasi data gagal');
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it('should register a new nasabah successfully without photo (201)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'new-user-1',
        username: 'budisantoso',
        role: 'NASABAH',
        appMakerId: mockAppMaker.id,
      });
      prismaMock.nasabah.create.mockResolvedValue({
        id: 'new-nasabah-1',
        namaNasabah: 'Budi Santoso',
        alamat: 'Jl. Merdeka No. 1',
        telp: '08123456789',
        foto: null,
        saldoPoin: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/nasabah/register')
        .set('x-app-key', mockAppMaker.appKey)
        .send({
          username: 'budisantoso',
          password: 'password123',
          namaNasabah: 'Budi Santoso',
          alamat: 'Jl. Merdeka No. 1',
          telp: '08123456789',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registrasi nasabah berhasil');
      expect(res.body.data.username).toBe('budisantoso');
      expect(res.body.data.role).toBe('NASABAH');
      expect(res.body.data.nasabah.namaNasabah).toBe('Budi Santoso');
      expect(res.body.data.nasabah.foto).toBeNull();
    });

    it('should register a new nasabah with photo upload (multipart/form-data) (201)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'new-user-2',
        username: 'sitirahma',
        role: 'NASABAH',
        appMakerId: mockAppMaker.id,
      });
      prismaMock.nasabah.create.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'new-nasabah-2',
          namaNasabah: args.data.namaNasabah,
          alamat: args.data.alamat,
          telp: args.data.telp,
          foto: args.data.foto,
          saldoPoin: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/nasabah/register')
        .set('x-app-key', mockAppMaker.appKey)
        .field('username', 'sitirahma')
        .field('password', 'password123')
        .field('namaNasabah', 'Siti Rahma')
        .field('alamat', 'Jl. Kenanga No. 5')
        .field('telp', '08987654321')
        .attach('foto', Buffer.from('fake image data'), {
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nasabah.foto).toMatch(/^\/uploads\/nasabah\/.+\.jpg$/);
    });

    it('should return 409 if username is already taken in the same tenant', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockNasabahUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/nasabah/register')
        .set('x-app-key', mockAppMaker.appKey)
        .send({
          username: 'nasabah1',
          password: 'password123',
          namaNasabah: 'Budi Santoso',
          alamat: 'Jl. Merdeka No. 1',
          telp: '08123456789',
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Username sudah terdaftar pada Bank Sampah ini');
    });
  });

  describe('POST /api/v1/auth/admin/register', () => {
    it('should register a new admin unit successfully (201)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'admin-user-1',
        username: 'adminutama',
        role: 'ADMIN',
        appMakerId: mockAppMaker.id,
      });
      prismaMock.adminBank.create.mockResolvedValue({
        id: 'admin-unit-1',
        namaUnit: 'Bank Sampah Asri',
        namaPengelola: 'Pak Hendra',
        telp: '08122334455',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/admin/register')
        .set('x-app-key', mockAppMaker.appKey)
        .send({
          username: 'adminutama',
          password: 'adminsecret123',
          namaUnit: 'Bank Sampah Asri',
          namaPengelola: 'Pak Hendra',
          telp: '08122334455',
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registrasi admin berhasil');
      expect(res.body.data.role).toBe('ADMIN');
      expect(res.body.data.adminBank.namaUnit).toBe('Bank Sampah Asri');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully and return JWT token with user role (200)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockNasabahUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-app-key', mockAppMaker.appKey)
        .send({
          username: 'nasabah1',
          password: 'secret123',
        })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login berhasil');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('NASABAH');
      expect(res.body.data.user.username).toBe('nasabah1');
      expect(res.body.data.user.nasabah.namaNasabah).toBe('Budi Santoso');
    });

    it('should return 401 if password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockNasabahUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-app-key', mockAppMaker.appKey)
        .send({
          username: 'nasabah1',
          password: 'wrongPassword',
        })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Username atau password salah');
    });

    it('should return 401 if user does not exist in tenant', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-app-key', mockAppMaker.appKey)
        .send({
          username: 'unknownuser',
          password: 'password123',
        })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Username atau password salah');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('x-app-key', mockAppMaker.appKey)
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Token otentikasi diperlukan');
    });

    it('should return active user profile when valid token and x-app-key are provided (200)', async () => {
      // First login to get a real token signed with the test secret
      prismaMock.user.findUnique.mockResolvedValue(mockNasabahUser);

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-app-key', mockAppMaker.appKey)
        .send({
          username: 'nasabah1',
          password: 'secret123',
        })
        .expect(200);

      const token = loginRes.body.data.token;

      // Call GET /api/v1/auth/me
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('x-app-key', mockAppMaker.appKey)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meRes.body.statusCode).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.message).toBe('Profil pengguna berhasil dimuat');
      expect(meRes.body.data.id).toBe(mockNasabahUser.id);
      expect(meRes.body.data.username).toBe('nasabah1');
      expect(meRes.body.data.role).toBe('NASABAH');
      expect(meRes.body.data.password).toBeUndefined();
      expect(meRes.body.data.nasabah.namaNasabah).toBe('Budi Santoso');
    });
  });
});
