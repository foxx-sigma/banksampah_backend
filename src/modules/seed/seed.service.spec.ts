import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SeedService } from './seed.service.js';
import { PrismaService } from '../../common/prisma.service.js';

describe('SeedService', () => {
  let service: SeedService;
  let prismaMock: any;

  const mockAppMakerId = 'tenant-uuid-1';

  beforeEach(async () => {
    const txMock = {
      detailSetor: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      setorSampah: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'setor-1' }),
      },
      penukaranPoin: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'tukar-1' }),
      },
      hadiah: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        create: vi.fn().mockResolvedValue({ id: 'hadiah-1' }),
      },
      kategoriSampah: {
        deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
        create: vi.fn().mockResolvedValue({ id: 'kat-1' }),
      },
      nasabah: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      adminBank: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        create: vi.fn().mockImplementation((args: any) => {
          if (args.data.role === 'ADMIN') {
            return Promise.resolve({
              id: 'user-admin',
              username: args.data.username,
              role: args.data.role,
              adminBank: { namaUnit: 'Bank Sampah Unit Berkah' },
            });
          }
          return Promise.resolve({
            id: `user-${args.data.username}`,
            username: args.data.username,
            role: args.data.role,
            nasabah: {
              id: `nasabah-${args.data.username}`,
              namaNasabah: args.data.nasabah?.create?.namaNasabah,
              saldoPoin: args.data.nasabah?.create?.saldoPoin,
            },
          });
        }),
      },
    };

    prismaMock = {
      $transaction: vi.fn().mockImplementation((cb: any) => cb(txMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  it('should generate dummy seed data and return credentials summary', async () => {
    const result = await service.seedTenantData(mockAppMakerId);

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(result.kredensial).toBeDefined();
    expect(result.kredensial.admin.username).toBe('admin_bank');
    expect(result.kredensial.admin.password).toBe('password123');
    expect(result.kredensial.admin.role).toBe('ADMIN');

    expect(result.kredensial.nasabah).toHaveLength(2);
    expect(result.kredensial.nasabah[0].username).toBe('nasabah1');
    expect(result.kredensial.nasabah[0].password).toBe('password123');
    expect(result.kredensial.nasabah[0].saldoPoin).toBe(750);
    expect(result.kredensial.nasabah[1].username).toBe('nasabah2');
    expect(result.kredensial.nasabah[1].password).toBe('password123');
    expect(result.kredensial.nasabah[1].saldoPoin).toBe(1500);

    expect(result.ringkasanData).toEqual({
      totalAdmin: 1,
      totalNasabah: 2,
      totalKategoriSampah: 4,
      totalHadiah: 3,
      totalTransaksiSetor: 1,
      totalTransaksiPenukaran: 1,
    });
  });
});
