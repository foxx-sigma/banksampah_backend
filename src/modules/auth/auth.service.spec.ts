import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

describe('AuthService & JwtStrategy', () => {
  let authService: AuthService;
  let jwtStrategy: JwtStrategy;
  let prismaMock: any;
  let jwtServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      adminBank: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    jwtServiceMock = {
      signAsync: vi.fn(),
    };

    authService = new AuthService(prismaMock, jwtServiceMock);
    jwtStrategy = new JwtStrategy(prismaMock);
  });

  describe('registerNasabah', () => {
    it('should successfully register a new nasabah without photo', async () => {
      const dto = {
        username: 'nasabah1',
        password: 'password123',
        namaNasabah: 'Budi Santoso',
        alamat: 'Jl. Merdeka No. 1',
        telp: '08123456789',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'user-1',
        username: 'nasabah1',
        role: 'NASABAH',
        nasabah: {
          id: 'nasabah-1',
          namaNasabah: 'Budi Santoso',
          alamat: 'Jl. Merdeka No. 1',
          telp: '08123456789',
          foto: null,
          saldoPoin: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await authService.registerNasabah(dto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'nasabah1' },
      });
      expect(result.id).toBe('user-1');
      expect(result.role).toBe('NASABAH');
      expect(result.nasabah.namaNasabah).toBe('Budi Santoso');
      expect(result.nasabah.foto).toBeNull();
    });

    it('should successfully register a new nasabah with photo', async () => {
      const dto = {
        username: 'nasabah2',
        password: 'password123',
        namaNasabah: 'Siti Rahma',
        alamat: 'Jl. Melati No. 2',
        telp: '08987654321',
      };
      const fotoUrl = '/uploads/nasabah/siti.jpg';

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'user-2',
        username: 'nasabah2',
        role: 'NASABAH',
        nasabah: {
          id: 'nasabah-2',
          namaNasabah: 'Siti Rahma',
          alamat: 'Jl. Melati No. 2',
          telp: '08987654321',
          foto: fotoUrl,
          saldoPoin: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await authService.registerNasabah(dto, fotoUrl);

      expect(result.nasabah.foto).toBe(fotoUrl);
    });

    it('should throw ConflictException if username already exists', async () => {
      const dto = {
        username: 'nasabah1',
        password: 'password123',
        namaNasabah: 'Budi Santoso',
        alamat: 'Jl. Merdeka No. 1',
        telp: '08123456789',
      };

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'existing-user-id',
        username: 'nasabah1',
      });

      await expect(
        authService.registerNasabah(dto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('registerAdmin', () => {
    it('should successfully register a new admin', async () => {
      const dto = {
        username: 'admin1',
        password: 'adminpassword123',
        namaUnit: 'Bank Sampah Mandiri',
        namaPengelola: 'Pak Joko',
        telp: '08111222333',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'admin-user-1',
        username: 'admin1',
        role: 'ADMIN',
        adminBank: {
          id: 'admin-bank-1',
          namaUnit: 'Bank Sampah Mandiri',
          namaPengelola: 'Pak Joko',
          telp: '08111222333',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await authService.registerAdmin(dto);

      expect(result.id).toBe('admin-user-1');
      expect(result.role).toBe('ADMIN');
      expect(result.adminBank.namaUnit).toBe('Bank Sampah Mandiri');
    });

    it('should throw ConflictException if admin username already exists', async () => {
      const dto = {
        username: 'admin1',
        password: 'adminpassword123',
        namaUnit: 'Bank Sampah Mandiri',
        namaPengelola: 'Pak Joko',
        telp: '08111222333',
      };

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'existing-admin-id',
      });

      await expect(authService.registerAdmin(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if admin unit is already registered', async () => {
      const dto = {
        username: 'admin2',
        password: 'adminpassword123',
        namaUnit: 'Bank Sampah Kedua',
        namaPengelola: 'Pak Joko',
        telp: '08111222333',
      };

      prismaMock.adminBank.findFirst.mockResolvedValue({
        id: 'admin-bank-1',
        namaUnit: 'Bank Sampah Pertama',
      });

      await expect(authService.registerAdmin(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should successfully login and generate JWT token', async () => {
      const dto = { username: 'nasabah1', password: 'password123' };
      const hashedPassword = await bcrypt.hash('password123', 10);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'nasabah1',
        password: hashedPassword,
        role: 'NASABAH',
        nasabah: {
          id: 'nasabah-1',
          namaNasabah: 'Budi Santoso',
          alamat: 'Jl. Merdeka',
          telp: '081234',
          foto: null,
          saldoPoin: 100,
        },
      });

      jwtServiceMock.signAsync.mockResolvedValue('jwt-token-xyz');

      const result = await authService.login(dto);

      expect(result.token).toBe('jwt-token-xyz');
      expect(result.accessToken).toBe('jwt-token-xyz');
      expect(result.user.username).toBe('nasabah1');
      expect(result.user.role).toBe('NASABAH');
      expect(result.user.nasabah?.saldoPoin).toBe(100);
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ username: 'unknown', password: 'pwd' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'nasabah1',
        password: hashedPassword,
      });

      await expect(
        authService.login({
          username: 'nasabah1',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('should return active user profile without password', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'nasabah1',
        password: 'hashedpassword',
        role: 'NASABAH',
        nasabah: { id: 'n-1', namaNasabah: 'Budi' },
        adminBank: null,
      });

      const result = await authService.getMe('user-1');

      expect(result.id).toBe('user-1');
      expect(result.username).toBe('nasabah1');
      expect((result as any).password).toBeUndefined();
      expect(result.nasabah?.namaNasabah).toBe('Budi');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.getMe('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('JwtStrategy', () => {
    it('should validate and return user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'nasabah1',
        role: 'NASABAH',
      });

      const result = await jwtStrategy.validate({
        sub: 'user-1',
        username: 'nasabah1',
        role: 'NASABAH',
      });

      expect(result.id).toBe('user-1');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        jwtStrategy.validate({
          sub: 'unknown-user',
          username: 'unknown',
          role: 'NASABAH',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
