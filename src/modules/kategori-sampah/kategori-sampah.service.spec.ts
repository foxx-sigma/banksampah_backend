import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JenisSampah } from '@prisma/client';
import { KategoriSampahService } from './kategori-sampah.service.js';
import { PrismaService } from '../../common/prisma.service.js';
import { StorageService } from '../../common/storage.service.js';

describe('KategoriSampahService', () => {
  let service: KategoriSampahService;
  let prismaMock: any;
  let storageMock: any;

  const mockAppMakerId = 'tenant-maker-123';
  const mockKategoriId = 'kategori-abc-456';

  const mockKategori = {
    id: mockKategoriId,
    appMakerId: mockAppMakerId,
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
    };

    storageMock = {
      uploadFile: vi.fn(),
      deleteFile: vi.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KategoriSampahService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageService, useValue: storageMock },
      ],
    }).compile();

    service = module.get<KategoriSampahService>(KategoriSampahService);
  });

  describe('findAll', () => {
    it('should return all categories belonging to the appMakerId', async () => {
      prismaMock.kategoriSampah.findMany.mockResolvedValue([mockKategori]);

      const result = await service.findAll(mockAppMakerId);

      expect(prismaMock.kategoriSampah.findMany).toHaveBeenCalledWith({
        where: { appMakerId: mockAppMakerId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].namaKategori).toBe('Botol Plastik PET');
    });
  });

  describe('create', () => {
    it('should create a new kategori sampah', async () => {
      const createDto = {
        namaKategori: 'Kardus Bekas',
        hargaPerKg: 1500,
        poinPerKg: 5,
        jenis: JenisSampah.kertas,
      };

      prismaMock.kategoriSampah.create.mockResolvedValue({
        id: 'new-kategori-id',
        appMakerId: mockAppMakerId,
        ...createDto,
        foto: 'https://supabase.co/foto.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        mockAppMakerId,
        createDto,
        'https://supabase.co/foto.jpg',
      );

      expect(prismaMock.kategoriSampah.create).toHaveBeenCalledWith({
        data: {
          appMakerId: mockAppMakerId,
          namaKategori: 'Kardus Bekas',
          hargaPerKg: 1500,
          poinPerKg: 5,
          jenis: JenisSampah.kertas,
          foto: 'https://supabase.co/foto.jpg',
        },
      });
      expect(result.namaKategori).toBe('Kardus Bekas');
      expect(result.jenis).toBe(JenisSampah.kertas);
    });
  });

  describe('findOne', () => {
    it('should return category when found within same tenant', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(mockKategori);

      const result = await service.findOne(mockAppMakerId, mockKategoriId);

      expect(prismaMock.kategoriSampah.findFirst).toHaveBeenCalledWith({
        where: { id: mockKategoriId, appMakerId: mockAppMakerId },
      });
      expect(result.id).toBe(mockKategoriId);
    });

    it('should throw NotFoundException if category not found or belongs to another tenant', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockAppMakerId, 'unknown-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if category to update is not found', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockAppMakerId, 'unknown-id', { namaKategori: 'Update' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update category fields and delete old photo when new photo uploaded', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(mockKategori);
      prismaMock.kategoriSampah.update.mockResolvedValue({
        ...mockKategori,
        namaKategori: 'Botol Plastik Tebal',
        foto: 'https://supabase.co/new.jpg',
      });

      const result = await service.update(
        mockAppMakerId,
        mockKategoriId,
        {
          namaKategori: 'Botol Plastik Tebal',
          hargaPerKg: 3500,
          poinPerKg: 12,
          jenis: JenisSampah.plastik,
        },
        'https://supabase.co/new.jpg',
      );

      expect(prismaMock.kategoriSampah.update).toHaveBeenCalled();
      expect(storageMock.deleteFile).toHaveBeenCalledWith(mockKategori.foto);
      expect(result.namaKategori).toBe('Botol Plastik Tebal');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if category not found in caller tenant', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockAppMakerId, 'unknown-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete category and clean up photo', async () => {
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(mockKategori);
      prismaMock.kategoriSampah.delete.mockResolvedValue(mockKategori);

      const result = await service.remove(mockAppMakerId, mockKategoriId);

      expect(prismaMock.kategoriSampah.delete).toHaveBeenCalledWith({
        where: { id: mockKategoriId },
      });
      expect(storageMock.deleteFile).toHaveBeenCalledWith(mockKategori.foto);
      expect(result).toEqual({ id: mockKategoriId, deleted: true });
    });
  });
});
