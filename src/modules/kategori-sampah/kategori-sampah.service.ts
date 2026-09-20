import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { StorageService } from '../../common/storage.service.js';
import {
  CreateKategoriSampahDto,
  UpdateKategoriSampahDto,
  QueryKategoriSampahDto,
} from './dto/index.js';

@Injectable()
export class KategoriSampahService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query?: QueryKategoriSampahDto) {
    if (!query || (query.search === undefined && query.jenis === undefined && query.page === undefined && query.limit === undefined)) {
      return this.prisma.kategoriSampah.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    const { search, jenis, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};

    if (search) {
      where.namaKategori = { contains: search, mode: 'insensitive' as const };
    }

    if (jenis) {
      where.jenis = jenis;
    }

    const [total, data] = await Promise.all([
      this.prisma.kategoriSampah.count({ where }),
      this.prisma.kategoriSampah.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return { data, meta };
  }

  async create(
    dto: CreateKategoriSampahDto,
    fotoUrl?: string,
  ) {
    return this.prisma.kategoriSampah.create({
      data: {
        namaKategori: dto.namaKategori.trim(),
        hargaPerKg: dto.hargaPerKg,
        poinPerKg: dto.poinPerKg,
        jenis: dto.jenis,
        foto: fotoUrl || null,
      },
    });
  }

  async findOne(id: string) {
    const kategori = await this.prisma.kategoriSampah.findFirst({
      where: { id },
    });

    if (!kategori) {
      throw new NotFoundException('Data kategori sampah tidak ditemukan');
    }

    return kategori;
  }

  async update(
    id: string,
    dto: UpdateKategoriSampahDto,
    fotoUrl?: string,
  ) {
    const existing = await this.prisma.kategoriSampah.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Data kategori sampah tidak ditemukan');
    }

    const updateData: any = {};
    if (dto.namaKategori !== undefined) {
      updateData.namaKategori = dto.namaKategori.trim();
    }
    if (dto.hargaPerKg !== undefined) {
      updateData.hargaPerKg = dto.hargaPerKg;
    }
    if (dto.poinPerKg !== undefined) {
      updateData.poinPerKg = dto.poinPerKg;
    }
    if (dto.jenis !== undefined) {
      updateData.jenis = dto.jenis;
    }
    if (fotoUrl !== undefined) {
      updateData.foto = fotoUrl;
    }

    const updated = await this.prisma.kategoriSampah.update({
      where: { id },
      data: updateData,
    });

    if (fotoUrl && existing.foto && existing.foto !== fotoUrl) {
      await this.storageService.deleteFile(existing.foto).catch(() => {});
    }

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.kategoriSampah.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Data kategori sampah tidak ditemukan');
    }

    await this.prisma.kategoriSampah.delete({
      where: { id },
    });

    if (existing.foto) {
      await this.storageService.deleteFile(existing.foto).catch(() => {});
    }

    return {
      id,
      deleted: true,
    };
  }
}
