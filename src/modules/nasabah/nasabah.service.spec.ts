import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { NasabahService } from './nasabah.service.js';
import { PrismaService } from '../../common/prisma.service.js';
import { StorageService } from '../../common/storage.service.js';

describe('NasabahService', () => {
  let service: NasabahService;
  let prismaMock: any;
  let storageMock: any;

  const mockAppMakerId = 'tenant-123';
  const mockNasabahId = 'nasabah-456';
  const mockUserId = 'user-789';

  const mockNasabah = {
    id: mockNasabahId,
    appMakerId: mockAppMakerId,
    userId: mockUserId,
    namaNasabah: 'Budi Santoso',
    alamat: 'Jl. Merdeka No. 10',
    telp: '081234567890',
    tanggalLahir: new Date('1995-05-20'),
    foto: '/uploads/nasabah/budi.jpg',
    saldoPoin: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: mockUserId,
      username: 'budisantoso',
      role: 'NASABAH',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
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
      uploadFile: vi.fn(),
      deleteFile: vi.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NasabahService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageService, useValue: storageMock },
      ],
    }).compile();

    service = module.get<NasabahService>(NasabahService);
  });

  describe('findAll', () => {
    it('should return all nasabah belonging to appMakerId', async () => {
      prismaMock.nasabah.findMany.mockResolvedValue([mockNasabah]);

      const result = await service.findAll(mockAppMakerId);

      expect(prismaMock.nasabah.findMany).toHaveBeenCalledWith({
        where: { appMakerId: mockAppMakerId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].namaNasabah).toBe('Budi Santoso');
    });
  });

  describe('create', () => {
    const createDto = {
      username: 'budisantoso',
      password: 'password123',
      namaNasabah: 'Budi Santoso',
      alamat: 'Jl. Merdeka No. 10',
      telp: '081234567890',
      tanggalLahir: '1995-05-20',
    };

    it('should throw ConflictException if username already exists in tenant', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.create(mockAppMakerId, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and nasabah within transaction', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: mockUserId,
        username: 'budisantoso',
        role: 'NASABAH',
        appMakerId: mockAppMakerId,
      });
      prismaMock.nasabah.create.mockResolvedValue(mockNasabah);

      const result = await service.create(
        mockAppMakerId,
        createDto,
        'https://supabase.co/foto.jpg',
      );

      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(prismaMock.nasabah.create).toHaveBeenCalled();
      expect(result.id).toBe(mockNasabahId);
      expect(result.user.username).toBe('budisantoso');
    });
  });

  describe('findOne', () => {
    it('should return nasabah if found within same tenant', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(mockNasabah);

      const result = await service.findOne(mockAppMakerId, mockNasabahId);

      expect(prismaMock.nasabah.findFirst).toHaveBeenCalledWith({
        where: { id: mockNasabahId, appMakerId: mockAppMakerId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
      expect(result.id).toBe(mockNasabahId);
    });

    it('should throw NotFoundException if nasabah not found or different tenant', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockAppMakerId, 'other-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if nasabah does not exist in tenant', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockAppMakerId, 'other-id', { namaLengkap: 'Baru' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update nasabah fields and delete old photo when new photo uploaded', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(mockNasabah);
      prismaMock.nasabah.update.mockResolvedValue({
        ...mockNasabah,
        namaNasabah: 'Budi Santoso Update',
        foto: 'https://supabase.co/new-photo.jpg',
      });

      const result = await service.update(
        mockAppMakerId,
        mockNasabahId,
        {
          namaLengkap: 'Budi Santoso Update',
          noTelepon: '08111222333',
          alamat: 'Alamat Baru',
          tanggalLahir: '1995-06-01',
        },
        'https://supabase.co/new-photo.jpg',
      );

      expect(prismaMock.nasabah.update).toHaveBeenCalled();
      expect(storageMock.deleteFile).toHaveBeenCalledWith(mockNasabah.foto);
      expect(result.namaNasabah).toBe('Budi Santoso Update');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if nasabah not found in tenant', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockAppMakerId, 'unknown-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete nasabah and linked user in transaction, and remove photo', async () => {
      prismaMock.nasabah.findFirst.mockResolvedValue(mockNasabah);
      prismaMock.nasabah.delete.mockResolvedValue(mockNasabah);
      prismaMock.user.delete.mockResolvedValue(mockNasabah.user);

      const result = await service.remove(mockAppMakerId, mockNasabahId);

      expect(prismaMock.nasabah.delete).toHaveBeenCalledWith({
        where: { id: mockNasabahId },
      });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
      expect(storageMock.deleteFile).toHaveBeenCalledWith(mockNasabah.foto);
      expect(result).toEqual({ id: mockNasabahId, deleted: true });
    });
  });
});
