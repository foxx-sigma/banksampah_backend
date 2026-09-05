import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JenisSampah } from '@prisma/client';
import { RekapitulasiService } from './rekapitulasi.service.js';
import { PrismaService } from '../../common/prisma.service.js';

describe('RekapitulasiService', () => {
  let service: RekapitulasiService;
  let prismaMock: any;

  const mockAppMakerId = 'tenant-uuid-1';

  beforeEach(async () => {
    prismaMock = {
      setorSampah: {
        findMany: vi.fn(),
      },
      penukaranPoin: {
        findMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RekapitulasiService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<RekapitulasiService>(RekapitulasiService);
  });

  describe('getRekapitulasiBulanan', () => {
    it('should aggregate tonase, rupiah, and points correctly for completed transactions', async () => {
      prismaMock.setorSampah.findMany.mockResolvedValue([
        {
          id: 'setor-1',
          appMakerId: mockAppMakerId,
          status: 'selesai',
          tanggal: new Date('2026-09-10'),
          detailSetor: [
            {
              beratKg: 10,
              beratKgReal: 10,
              subtotalPoin: 100,
              subtotalPoinReal: 100,
              kategoriSampah: {
                jenis: JenisSampah.plastik,
                hargaPerKg: 3000,
              },
            },
            {
              beratKg: 5,
              beratKgReal: 5,
              subtotalPoin: 25,
              subtotalPoinReal: 25,
              kategoriSampah: {
                jenis: JenisSampah.kertas,
                hargaPerKg: 1500,
              },
            },
          ],
        },
      ]);

      prismaMock.penukaranPoin.findMany.mockResolvedValue([
        {
          id: 'penukaran-1',
          status: 'selesai',
          poinDigunakan: 50,
        },
        {
          id: 'penukaran-2',
          status: 'selesai',
          poinDigunakan: 100,
        },
      ]);

      const result = await service.getRekapitulasiBulanan(mockAppMakerId, {
        bulan: '2026-09',
      });

      expect(result.bulan).toBe('2026-09');
      expect(result.rekapitulasiTonase.totalKg).toBe(15);
      expect(result.rekapitulasiTonase.totalTon).toBe(0.015);
      expect(result.rekapitulasiTonase.totalEstimasiPembayaranRupiah).toBe(
        10 * 3000 + 5 * 1500, // 30000 + 7500 = 37500
      );
      expect(result.rekapitulasiTonase.totalPoinDiterbitkan).toBe(125);

      expect(result.breakdownJenisSampah.plastik).toEqual({
        tonaseKg: 10,
        rupiah: 30000,
        poin: 100,
      });
      expect(result.breakdownJenisSampah.kertas).toEqual({
        tonaseKg: 5,
        rupiah: 7500,
        poin: 25,
      });
      expect(result.breakdownJenisSampah.logam).toEqual({
        tonaseKg: 0,
        rupiah: 0,
        poin: 0,
      });
      expect(result.breakdownJenisSampah.kaca).toEqual({
        tonaseKg: 0,
        rupiah: 0,
        poin: 0,
      });

      expect(result.rekapitulasiPenukaranPoin.totalTransaksiPenukaran).toBe(2);
      expect(result.rekapitulasiPenukaranPoin.totalPoinTerpakai).toBe(150);
    });

    it('should throw BadRequestException if bulan query is invalid or missing', async () => {
      await expect(
        service.getRekapitulasiBulanan(mockAppMakerId, { bulan: '' as any }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.getRekapitulasiBulanan(mockAppMakerId, { bulan: '2026/09' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return empty counts if no finished transactions', async () => {
      prismaMock.setorSampah.findMany.mockResolvedValue([]);
      prismaMock.penukaranPoin.findMany.mockResolvedValue([]);

      const result = await service.getRekapitulasiBulanan(mockAppMakerId, {
        bulan: '2026-09',
      });

      expect(result.rekapitulasiTonase.totalKg).toBe(0);
      expect(result.rekapitulasiTonase.totalTon).toBe(0);
      expect(result.rekapitulasiTonase.totalEstimasiPembayaranRupiah).toBe(0);
      expect(result.rekapitulasiTonase.totalPoinDiterbitkan).toBe(0);
      expect(result.rekapitulasiPenukaranPoin.totalTransaksiPenukaran).toBe(0);
      expect(result.rekapitulasiPenukaranPoin.totalPoinTerpakai).toBe(0);
    });
  });
});
