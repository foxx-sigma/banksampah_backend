import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AppMakerService } from './app-maker.service.js';

describe('AppMakerService', () => {
  let service: AppMakerService;
  let prismaMock: any;
  let jwtServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      appMaker: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      nasabah: {
        count: vi.fn(),
      },
      kategoriSampah: {
        count: vi.fn(),
      },
      setorSampah: {
        count: vi.fn(),
      },
      hadiah: {
        count: vi.fn(),
      },
    };

    jwtServiceMock = {
      signAsync: vi.fn(),
    };

    service = new AppMakerService(prismaMock, jwtServiceMock);
  });

  describe('register', () => {
    it('should successfully register a new AppMaker', async () => {
      const dto = {
        email: 'siswa@example.com',
        password: 'password123',
        namaSiswa: 'Budi Santoso',
        kelas: 'XII RPL 1',
        namaApp: 'Bank Sampah Digital',
      };

      prismaMock.appMaker.findUnique.mockResolvedValue(null);
      prismaMock.appMaker.create.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'maker-uuid-1',
          email: args.data.email,
          namaSiswa: args.data.namaSiswa,
          kelas: args.data.kelas,
          namaApp: args.data.namaApp,
          appKey: args.data.appKey,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.register(dto);

      expect(prismaMock.appMaker.findUnique).toHaveBeenCalledWith({
        where: { email: 'siswa@example.com' },
      });
      expect(prismaMock.appMaker.create).toHaveBeenCalled();
      expect(result.email).toBe('siswa@example.com');
      expect(result.appKey).toBeDefined();
      expect(result.namaSiswa).toBe('Budi Santoso');
      // Password must not be returned
      expect((result as any).password).toBeUndefined();
    });

    it('should throw ConflictException if email is already registered globally', async () => {
      const dto = {
        email: 'exists@example.com',
        password: 'password123',
        namaSiswa: 'Siswa Lain',
        kelas: 'XII RPL 2',
        namaApp: 'Bank Sampah 2',
      };

      prismaMock.appMaker.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'exists@example.com',
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(prismaMock.appMaker.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully login and return JWT token and appKey', async () => {
      const dto = {
        email: 'siswa@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.appMaker.findUnique.mockResolvedValue({
        id: 'maker-123',
        email: 'siswa@example.com',
        password: hashedPassword,
        namaSiswa: 'Budi Santoso',
        kelas: 'XII RPL 1',
        namaApp: 'Bank Sampah Digital',
        appKey: 'appkey-uuid-123',
      });

      jwtServiceMock.signAsync.mockResolvedValue('jwt-access-token');

      const result = await service.login(dto);

      expect(result.token).toBe('jwt-access-token');
      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.appKey).toBe('appkey-uuid-123');
      expect(result.maker.email).toBe('siswa@example.com');
      expect((result.maker as any).password).toBeUndefined();
    });

    it('should throw UnauthorizedException if email is not found', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'notfound@example.com', password: 'secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      prismaMock.appMaker.findUnique.mockResolvedValue({
        id: 'maker-123',
        email: 'siswa@example.com',
        password: hashedPassword,
      });

      await expect(
        service.login({ email: 'siswa@example.com', password: 'wrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return profile and aggregated statistics', async () => {
      const appMakerId = 'maker-123';
      prismaMock.appMaker.findUnique.mockResolvedValue({
        id: appMakerId,
        email: 'siswa@example.com',
        namaSiswa: 'Budi Santoso',
        kelas: 'XII RPL 1',
        namaApp: 'Bank Sampah Digital',
        appKey: 'appkey-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.nasabah.count.mockResolvedValue(5);
      prismaMock.kategoriSampah.count.mockResolvedValue(4);
      prismaMock.setorSampah.count.mockResolvedValue(12);
      prismaMock.hadiah.count.mockResolvedValue(3);

      const result = await service.getProfile(appMakerId);

      expect(result.id).toBe(appMakerId);
      expect(result.totalNasabah).toBe(5);
      expect(result.totalKategoriSampah).toBe(4);
      expect(result.totalTransaksiSetor).toBe(12);
      expect(result.totalHadiah).toBe(3);
      expect(result.statistik).toEqual({
        totalNasabah: 5,
        totalKategoriSampah: 4,
        totalTransaksiSetor: 12,
        totalHadiah: 3,
      });
    });

    it('should throw NotFoundException if maker not found', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkKey', () => {
    it('should return appKey when email exists', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue({
        email: 'siswa@example.com',
        appKey: 'appkey-uuid-123',
        namaSiswa: 'Budi Santoso',
        namaApp: 'Bank Sampah Digital',
      });

      const result = await service.checkKey('siswa@example.com');

      expect(result.email).toBe('siswa@example.com');
      expect(result.appKey).toBe('appkey-uuid-123');
      expect(result.namaSiswa).toBe('Budi Santoso');
      expect(result.namaApp).toBe('Bank Sampah Digital');
    });

    it('should throw NotFoundException when email does not exist', async () => {
      prismaMock.appMaker.findUnique.mockResolvedValue(null);

      await expect(service.checkKey('notfound@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
