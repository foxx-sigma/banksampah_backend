import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../../common/prisma.service.js';

describe('DashboardService', () => {
  let service: DashboardService;
  let prismaMock: any;

  const mockAppMakerId = 'tenant-uuid-1';
  const mockUserId = 'user-uuid-1';
  const mockNasabahId = 'nasabah-uuid-1';

  beforeEach(async () => {
    prismaMock = {
      nasabah: {
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      kategoriSampah: {
        count: vi.fn(),
      },
      setorSampah: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
      hadiah: {
        count: vi.fn(),
      },
      penukaranPoin: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getSummary', () => {
    it('should return correct summary for a nasabah with transactions', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue({
        id: mockNasabahId,
        userId: mockUserId,
        appMakerId: mockAppMakerId,
        saldoPoin: 500,
      });

      prismaMock.setorSampah.findMany.mockResolvedValue([
        {
          totalBeratKg: 5,
          totalBeratKgReal: 5.5,
          estimasiTotalPoin: 100,
          totalPoinReal: 110,
        },
        {
          totalBeratKg: 3,
          totalBeratKgReal: null,
          estimasiTotalPoin: 60,
          totalPoinReal: null,
        },
      ]);

      prismaMock.penukaranPoin.findMany.mockResolvedValue([
        { poinDigunakan: 50 },
        { poinDigunakan: 100 },
      ]);

      const mockSetorTerakhir = {
        id: 'setor-1',
        totalBeratKg: 3,
        detailSetor: [],
      };
      const mockTukarTerakhir = {
        id: 'tukar-1',
        poinDigunakan: 100,
        hadiah: { namaHadiah: 'Tumbler' },
      };

      prismaMock.setorSampah.findFirst.mockResolvedValue(mockSetorTerakhir);
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(mockTukarTerakhir);

      const result = await service.getSummary(mockAppMakerId, mockUserId);

      expect(result.saldoPoinSaatIni).toBe(500);
      expect(result.totalSampahDisetorKg).toBe(8.5); // 5.5 + 3
      expect(result.totalPoinDidapat).toBe(170); // 110 + 60
      expect(result.totalPoinDitukar).toBe(150); // 50 + 100
      expect(result.transaksiTerakhirSetor).toEqual(mockSetorTerakhir);
      expect(result.transaksiTerakhirTukar).toEqual(mockTukarTerakhir);
    });

    it('should throw NotFoundException if nasabah is not found or wrong tenant', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue(null);

      await expect(
        service.getSummary(mockAppMakerId, mockUserId),
      ).rejects.toThrow(NotFoundException);

      prismaMock.nasabah.findUnique.mockResolvedValue({
        id: mockNasabahId,
        userId: mockUserId,
        appMakerId: 'other-tenant',
      });

      await expect(
        service.getSummary(mockAppMakerId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 0s and nulls if nasabah has no transactions', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue({
        id: mockNasabahId,
        userId: mockUserId,
        appMakerId: mockAppMakerId,
        saldoPoin: 0,
      });

      prismaMock.setorSampah.findMany.mockResolvedValue([]);
      prismaMock.penukaranPoin.findMany.mockResolvedValue([]);
      prismaMock.setorSampah.findFirst.mockResolvedValue(null);
      prismaMock.penukaranPoin.findFirst.mockResolvedValue(null);

      const result = await service.getSummary(mockAppMakerId, mockUserId);

      expect(result.saldoPoinSaatIni).toBe(0);
      expect(result.totalSampahDisetorKg).toBe(0);
      expect(result.totalPoinDidapat).toBe(0);
      expect(result.totalPoinDitukar).toBe(0);
      expect(result.transaksiTerakhirSetor).toBeNull();
      expect(result.transaksiTerakhirTukar).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return correct tenant statistics', async () => {
      prismaMock.nasabah.count.mockResolvedValue(10);
      prismaMock.kategoriSampah.count.mockResolvedValue(4);
      prismaMock.setorSampah.count.mockResolvedValue(15);
      prismaMock.hadiah.count.mockResolvedValue(5);

      prismaMock.setorSampah.findMany.mockResolvedValue([
        {
          totalBeratKg: 10,
          totalBeratKgReal: 12.5,
          estimasiTotalPoin: 200,
          totalPoinReal: 250,
        },
        {
          totalBeratKg: 7.5,
          totalBeratKgReal: null,
          estimasiTotalPoin: 150,
          totalPoinReal: null,
        },
      ]);

      const result = await service.getStats(mockAppMakerId);

      expect(result.totalNasabah).toBe(10);
      expect(result.totalKategoriSampah).toBe(4);
      expect(result.totalTransaksiSetor).toBe(15);
      expect(result.totalHadiah).toBe(5);
      expect(result.totalBeratSampahKg).toBe(20); // 12.5 + 7.5
      expect(result.totalPoinTersalurkan).toBe(400); // 250 + 150
    });

    it('should return 0s if tenant has no data', async () => {
      prismaMock.nasabah.count.mockResolvedValue(0);
      prismaMock.kategoriSampah.count.mockResolvedValue(0);
      prismaMock.setorSampah.count.mockResolvedValue(0);
      prismaMock.hadiah.count.mockResolvedValue(0);
      prismaMock.setorSampah.findMany.mockResolvedValue([]);

      const result = await service.getStats(mockAppMakerId);

      expect(result.totalNasabah).toBe(0);
      expect(result.totalKategoriSampah).toBe(0);
      expect(result.totalTransaksiSetor).toBe(0);
      expect(result.totalHadiah).toBe(0);
      expect(result.totalBeratSampahKg).toBe(0);
      expect(result.totalPoinTersalurkan).toBe(0);
    });
  });
});
