import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StatusPenukaran } from '@prisma/client';
import { PenukaranPoinService } from './penukaran-poin.service.js';
import { PrismaService } from '../../common/prisma.service.js';

describe('PenukaranPoinService', () => {
  let service: PenukaranPoinService;
  let prismaMock: any;

  const mockAppMakerId = 'tenant-uuid-1';
  const mockUserId = 'user-uuid-1';
  const mockNasabahId = 'nasabah-uuid-1';
  const mockHadiahId = 'hadiah-uuid-1';
  const mockPenukaranId = 'penukaran-uuid-1';

  const mockNasabah = {
    id: mockNasabahId,
    appMakerId: mockAppMakerId,
    userId: mockUserId,
    namaNasabah: 'Budi Nasabah',
    saldoPoin: 150,
  };

  const mockHadiah = {
    id: mockHadiahId,
    appMakerId: mockAppMakerId,
    namaHadiah: 'Tumbler Ramah Lingkungan',
    poinDibutuhkan: 100,
    stok: 5,
    foto: 'https://supabase.co/tumbler.jpg',
  };

  const mockPenukaran = {
    id: mockPenukaranId,
    kodePenukaran: 'TKR-202609-ABCD',
    appMakerId: mockAppMakerId,
    nasabahId: mockNasabahId,
    hadiahId: mockHadiahId,
    poinDigunakan: 100,
    status: StatusPenukaran.diproses,
    catatan: null,
    tanggal: new Date(),
    nasabah: mockNasabah,
    hadiah: mockHadiah,
  };

  beforeEach(async () => {
    prismaMock = {
      nasabah: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      hadiah: {
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      penukaranPoin: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PenukaranPoinService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PenukaranPoinService>(PenukaranPoinService);
  });

  describe('tukarPoin', () => {
    it('should redeem reward successfully, decrement saldoPoin and stock atomically', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue(mockNasabah);
      prismaMock.hadiah.findFirst.mockResolvedValue(mockHadiah);
      prismaMock.penukaranPoin.create.mockResolvedValue(mockPenukaran);

      const result = await service.tukarPoin(mockAppMakerId, mockUserId, {
        hadiahId: mockHadiahId,
        catatan: 'Warna biru jika ada',
      });

      expect(prismaMock.hadiah.updateMany).toHaveBeenCalledWith({
        where: { id: mockHadiahId, appMakerId: mockAppMakerId, stok: { gte: 1 } },
        data: { stok: { decrement: 1 } },
      });
      expect(prismaMock.nasabah.updateMany).toHaveBeenCalledWith({
        where: { id: mockNasabahId, appMakerId: mockAppMakerId, saldoPoin: { gte: 100 } },
        data: { saldoPoin: { decrement: 100 } },
      });
      expect(prismaMock.penukaranPoin.create).toHaveBeenCalled();
      const createArgs = prismaMock.penukaranPoin.create.mock.calls[0][0];
      expect(createArgs.data.kodePenukaran).toMatch(/^TKR-\d{6}-[A-Z0-9]{4}$/);
      expect(createArgs.data.poinDigunakan).toBe(100);
      expect(result.id).toBe(mockPenukaranId);
    });

    it('should throw BadRequestException if hadiah stock is exhausted (<= 0)', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue(mockNasabah);
      prismaMock.hadiah.findFirst.mockResolvedValue({
        ...mockHadiah,
        stok: 0,
      });

      await expect(
        service.tukarPoin(mockAppMakerId, mockUserId, {
          hadiahId: mockHadiahId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if nasabah saldoPoin is less than poinDibutuhkan', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue({
        ...mockNasabah,
        saldoPoin: 50, // needs 100
      });
      prismaMock.hadiah.findFirst.mockResolvedValue(mockHadiah);

      await expect(
        service.tukarPoin(mockAppMakerId, mockUserId, {
          hadiahId: mockHadiahId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if hadiah not found in tenant', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue(mockNasabah);
      prismaMock.hadiah.findFirst.mockResolvedValue(null);

      await expect(
        service.tukarPoin(mockAppMakerId, mockUserId, {
          hadiahId: 'other-hadiah-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMyPenukaran', () => {
    it('should return penukaran list for caller nasabah', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue(mockNasabah);
      prismaMock.penukaranPoin.findMany.mockResolvedValue([mockPenukaran]);

      const result = await service.findMyPenukaran(mockAppMakerId, mockUserId, {
        bulan: '2026-09',
      });

      expect(prismaMock.penukaranPoin.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('findAllAdmin', () => {
    it('should return all penukaran list within caller tenant for admin', async () => {
      prismaMock.penukaranPoin.findMany.mockResolvedValue([mockPenukaran]);

      const result = await service.findAllAdmin(mockAppMakerId, {
        status: StatusPenukaran.diproses,
      });

      expect(prismaMock.penukaranPoin.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('should update penukaran status by admin', async () => {
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(mockPenukaran);
      prismaMock.penukaranPoin.update.mockResolvedValue({
        ...mockPenukaran,
        status: StatusPenukaran.selesai,
      });

      const result = await service.updateStatus(
        mockAppMakerId,
        mockPenukaranId,
        {
          status: StatusPenukaran.selesai,
          catatan: 'Sudah diambil di kasir',
        },
      );

      expect(prismaMock.penukaranPoin.update).toHaveBeenCalled();
      expect(result.status).toBe(StatusPenukaran.selesai);
    });
  });

  describe('getNota', () => {
    it('should allow admin to view any nota in tenant', async () => {
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(mockPenukaran);

      const result = await service.getNota(mockAppMakerId, mockPenukaranId, {
        role: 'ADMIN',
        id: 'admin-1',
      });

      expect(result.id).toBe(mockPenukaranId);
    });

    it('should allow owner nasabah to view own nota', async () => {
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(mockPenukaran);

      const result = await service.getNota(mockAppMakerId, mockPenukaranId, {
        role: 'NASABAH',
        userId: mockUserId,
      });

      expect(result.id).toBe(mockPenukaranId);
    });

    it('should throw NotFoundException if another nasabah attempts to view nota', async () => {
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(mockPenukaran);

      await expect(
        service.getNota(mockAppMakerId, mockPenukaranId, {
          role: 'NASABAH',
          userId: 'stranger-user-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
