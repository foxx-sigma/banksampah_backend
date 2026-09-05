import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HadiahService } from './hadiah.service.js';
import { PrismaService } from '../../common/prisma.service.js';
import { StorageService } from '../../common/storage.service.js';

describe('HadiahService', () => {
  let service: HadiahService;
  let prismaMock: any;
  let storageMock: any;

  const mockAppMakerId = 'tenant-maker-123';
  const mockHadiahId = 'hadiah-abc-456';

  const mockHadiah = {
    id: mockHadiahId,
    appMakerId: mockAppMakerId,
    namaHadiah: 'Tumbler Stainless Steel',
    deskripsi: 'Tumbler ramah lingkungan 500ml',
    poinDibutuhkan: 250,
    stok: 15,
    foto: 'https://supabase.co/storage/v1/object/public/hadiah/tumbler.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = {
      hadiah: {
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
        HadiahService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageService, useValue: storageMock },
      ],
    }).compile();

    service = module.get<HadiahService>(HadiahService);
  });

  describe('findAll', () => {
    it('should return all gifts belonging to the appMakerId', async () => {
      prismaMock.hadiah.findMany.mockResolvedValue([mockHadiah]);

      const result = await service.findAll(mockAppMakerId);

      expect(prismaMock.hadiah.findMany).toHaveBeenCalledWith({
        where: { appMakerId: mockAppMakerId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].namaHadiah).toBe('Tumbler Stainless Steel');
    });
  });

  describe('create', () => {
    it('should create a new gift with photo', async () => {
      const createDto = {
        namaHadiah: 'Tas Belanja Ramah Lingkungan',
        deskripsi: 'Tote bag kanvas',
        poinDibutuhkan: 100,
        stok: 50,
      };

      prismaMock.hadiah.create.mockResolvedValue({
        id: 'new-hadiah-id',
        appMakerId: mockAppMakerId,
        ...createDto,
        foto: 'https://supabase.co/hadiah.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        mockAppMakerId,
        createDto,
        'https://supabase.co/hadiah.jpg',
      );

      expect(prismaMock.hadiah.create).toHaveBeenCalledWith({
        data: {
          appMakerId: mockAppMakerId,
          namaHadiah: 'Tas Belanja Ramah Lingkungan',
          deskripsi: 'Tote bag kanvas',
          poinDibutuhkan: 100,
          stok: 50,
          foto: 'https://supabase.co/hadiah.jpg',
        },
      });
      expect(result.id).toBe('new-hadiah-id');
    });

    it('should create a new gift without photo and deskripsi defaults to null', async () => {
      const createDto = {
        namaHadiah: 'Payung Lipat',
        poinDibutuhkan: 150,
        stok: 20,
      };

      prismaMock.hadiah.create.mockResolvedValue({
        id: 'new-hadiah-id-2',
        appMakerId: mockAppMakerId,
        namaHadiah: 'Payung Lipat',
        deskripsi: null,
        poinDibutuhkan: 150,
        stok: 20,
        foto: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(mockAppMakerId, createDto);

      expect(prismaMock.hadiah.create).toHaveBeenCalledWith({
        data: {
          appMakerId: mockAppMakerId,
          namaHadiah: 'Payung Lipat',
          deskripsi: null,
          poinDibutuhkan: 150,
          stok: 20,
          foto: null,
        },
      });
      expect(result.foto).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return the gift if found under tenant', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue(mockHadiah);

      const result = await service.findOne(mockAppMakerId, mockHadiahId);

      expect(prismaMock.hadiah.findFirst).toHaveBeenCalledWith({
        where: { id: mockHadiahId, appMakerId: mockAppMakerId },
      });
      expect(result.id).toBe(mockHadiahId);
    });

    it('should throw NotFoundException if gift does not exist or belongs to another tenant', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockAppMakerId, 'other-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update gift and delete old photo if new photo is provided', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue(mockHadiah);
      prismaMock.hadiah.update.mockResolvedValue({
        ...mockHadiah,
        namaHadiah: 'Tumbler Custom',
        foto: 'https://supabase.co/new-photo.jpg',
      });

      const updateDto = {
        namaHadiah: 'Tumbler Custom',
        poinDibutuhkan: 300,
      };

      const result = await service.update(
        mockAppMakerId,
        mockHadiahId,
        updateDto,
        'https://supabase.co/new-photo.jpg',
      );

      expect(prismaMock.hadiah.update).toHaveBeenCalledWith({
        where: { id: mockHadiahId },
        data: {
          namaHadiah: 'Tumbler Custom',
          poinDibutuhkan: 300,
          foto: 'https://supabase.co/new-photo.jpg',
        },
      });
      expect(storageMock.deleteFile).toHaveBeenCalledWith(mockHadiah.foto);
      expect(result.namaHadiah).toBe('Tumbler Custom');
    });

    it('should throw NotFoundException on update if gift not found', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockAppMakerId, 'non-existent', { namaHadiah: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete gift and its photo from storage', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue(mockHadiah);
      prismaMock.hadiah.delete.mockResolvedValue(mockHadiah);

      const result = await service.remove(mockAppMakerId, mockHadiahId);

      expect(prismaMock.hadiah.delete).toHaveBeenCalledWith({
        where: { id: mockHadiahId },
      });
      expect(storageMock.deleteFile).toHaveBeenCalledWith(mockHadiah.foto);
      expect(result).toEqual({ id: mockHadiahId, deleted: true });
    });

    it('should throw NotFoundException on delete if gift not found', async () => {
      prismaMock.hadiah.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockAppMakerId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
