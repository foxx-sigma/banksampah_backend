import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StatusSetor } from '@prisma/client';
import { SetorSampahService } from './setor-sampah.service.js';
import { PrismaService } from '../../common/prisma.service.js';

describe('SetorSampahService', () => {
  let service: SetorSampahService;
  let prismaMock: any;

  const mockUserId = 'user-uuid-1';
  const mockNasabahId = 'nasabah-uuid-1';
  const mockKategoriId1 = 'kat-uuid-1';
  const mockKategoriId2 = 'kat-uuid-2';
  const mockSetorId = 'setor-uuid-1';

  const mockNasabah = {
    id: mockNasabahId,
    userId: mockUserId,
    namaNasabah: 'Budi Santoso',
    saldoPoin: 50,
  };

  const mockKategori1 = {
    id: mockKategoriId1,
    namaKategori: 'Botol Plastik PET',
    poinPerKg: 10,
  };

  const mockKategori2 = {
    id: mockKategoriId2,
    namaKategori: 'Kardus',
    poinPerKg: 5,
  };

  const mockSetor = {
    id: mockSetorId,
    kodeSetor: 'STR-202609-ABCD',
    nasabahId: mockNasabahId,
    tanggal: new Date(),
    totalBeratKg: 4.5,
    estimasiTotalPoin: 35,
    status: StatusSetor.menunggu_konfirmasi,
    catatan: 'Depan gerbang',
    catatanAdmin: null,
    nasabah: { ...mockNasabah, userId: mockUserId },
    detailSetor: [
      {
        id: 'detail-1',
        kategoriSampahId: mockKategoriId1,
        beratKg: 2,
        poinPerKg: 10,
        subtotalPoin: 20,
      },
      {
        id: 'detail-2',
        kategoriSampahId: mockKategoriId2,
        beratKg: 2.5,
        poinPerKg: 5,
        subtotalPoin: 15,
      },
    ],
  };

  beforeEach(async () => {
    prismaMock = {
      $transaction: vi.fn(async (cb) => typeof cb === 'function' ? cb(prismaMock) : Promise.all(cb)),
      nasabah: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      kategoriSampah: {
        findFirst: vi.fn(),
      },
      setorSampah: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      detailSetor: {
        update: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetorSampahService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SetorSampahService>(SetorSampahService);
  });

  describe('createPengajuan', () => {
    it('should calculate totalBeratKg and estimasiTotalPoin automatically and create SetorSampah', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue(mockNasabah);
      prismaMock.kategoriSampah.findFirst.mockImplementation((args: any) => {
        if (args.where.id === mockKategoriId1) return Promise.resolve(mockKategori1);
        if (args.where.id === mockKategoriId2) return Promise.resolve(mockKategori2);
        return Promise.resolve(null);
      });
      prismaMock.setorSampah.create.mockResolvedValue(mockSetor);

      const result = await service.createPengajuan(mockUserId, {
        catatan: 'Depan gerbang',
        items: [
          { kategoriSampahId: mockKategoriId1, beratKg: 2 },
          { kategoriSampahId: mockKategoriId2, beratKg: 2.5 },
        ],
      });

      expect(prismaMock.setorSampah.create).toHaveBeenCalled();
      const createArgs = prismaMock.setorSampah.create.mock.calls[0][0];
      expect(createArgs.data.totalBeratKg).toBe(4.5);
      expect(createArgs.data.estimasiTotalPoin).toBe(33);
      expect(createArgs.data.kodeSetor).toMatch(/^STR-\d{6}-[A-Z0-9]{4}$/);
      expect(result.id).toBe(mockSetorId);
    });

    it('should throw BadRequestException if a kategori is not found', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue(mockNasabah);
      prismaMock.kategoriSampah.findFirst.mockResolvedValue(null);

      await expect(
        service.createPengajuan(mockUserId, {
          items: [{ kategoriSampahId: 'invalid-id', beratKg: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMySetor', () => {
    it('should return setor list belonging to logged-in nasabah', async () => {
      prismaMock.nasabah.findUnique.mockResolvedValue(mockNasabah);
      prismaMock.setorSampah.findMany.mockResolvedValue([mockSetor]);

      const result = await service.findMySetor(mockUserId, {
        bulan: '2026-09',
      });

      expect(prismaMock.setorSampah.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockSetorId);
    });
  });

  describe('findAllAdmin', () => {
    it('should return all setor', async () => {
      prismaMock.setorSampah.findMany.mockResolvedValue([mockSetor]);

      const result = await service.findAllAdmin({
        status: StatusSetor.menunggu_konfirmasi,
      });

      expect(prismaMock.setorSampah.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should allow admin to view any setor', async () => {
      prismaMock.setorSampah.findFirst.mockResolvedValue(mockSetor);

      const result = await service.findOne(mockSetorId, {
        role: 'ADMIN',
        id: 'admin-1',
      });

      expect(result.id).toBe(mockSetorId);
    });

    it('should throw NotFoundException if nasabah tries to view another nasabah setor', async () => {
      prismaMock.setorSampah.findFirst.mockResolvedValue(mockSetor);

      await expect(
        service.findOne(mockSetorId, {
          role: 'NASABAH',
          userId: 'other-user-uuid',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verify', () => {
    it('should recalculate real points and increment nasabah saldoPoin when status becomes selesai', async () => {
      prismaMock.setorSampah.findFirst.mockResolvedValue(mockSetor);
      prismaMock.setorSampah.update.mockResolvedValue({
        ...mockSetor,
        status: StatusSetor.selesai,
        totalBeratKgReal: 5,
        totalPoinReal: 40,
      });

      const result = await service.verify(mockSetorId, {
        status: StatusSetor.selesai,
        catatanAdmin: 'Penimbangan valid',
        itemsReal: [
          { kategoriSampahId: mockKategoriId1, beratKgReal: 3 },
          { kategoriSampahId: mockKategoriId2, beratKgReal: 2 },
        ],
      });

      expect(prismaMock.nasabah.update).toHaveBeenCalledWith({
        where: { id: mockNasabahId },
        data: {
          saldoPoin: { increment: 40 },
        },
      });
      expect(result.status).toBe(StatusSetor.selesai);
    });

    it('should not increment points again if already status selesai', async () => {
      const alreadySelesaiSetor = {
        ...mockSetor,
        status: StatusSetor.selesai,
        totalPoinReal: 40,
      };
      prismaMock.setorSampah.findFirst.mockResolvedValue(alreadySelesaiSetor);
      prismaMock.setorSampah.update.mockResolvedValue(alreadySelesaiSetor);

      await service.verify(mockSetorId, {
        status: StatusSetor.selesai,
        catatanAdmin: 'Catatan tambahan',
      });

      expect(prismaMock.nasabah.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if attempting to revert status from selesai to another status', async () => {
      const alreadySelesaiSetor = {
        ...mockSetor,
        status: StatusSetor.selesai,
      };
      prismaMock.setorSampah.findFirst.mockResolvedValue(alreadySelesaiSetor);

      await expect(
        service.verify(mockSetorId, {
          status: StatusSetor.diverifikasi,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transaction is already ditolak', async () => {
      const ditolakSetor = {
        ...mockSetor,
        status: StatusSetor.ditolak,
      };
      prismaMock.setorSampah.findFirst.mockResolvedValue(ditolakSetor);

      await expect(
        service.verify(mockSetorId, {
          status: StatusSetor.selesai,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
