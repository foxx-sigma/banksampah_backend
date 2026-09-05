import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { StorageService } from '../../common/storage.service.js';
import {
  CreateKategoriSampahDto,
  UpdateKategoriSampahDto,
} from './dto/index.js';

@Injectable()
export class KategoriSampahService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(appMakerId: string) {
    return this.prisma.kategoriSampah.findMany({
      where: { appMakerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    appMakerId: string,
    dto: CreateKategoriSampahDto,
    fotoUrl?: string,
  ) {
    return this.prisma.kategoriSampah.create({
      data: {
        appMakerId,
        namaKategori: dto.namaKategori.trim(),
        hargaPerKg: dto.hargaPerKg,
        poinPerKg: dto.poinPerKg,
        jenis: dto.jenis,
        foto: fotoUrl || null,
      },
    });
  }

  async findOne(appMakerId: string, id: string) {
    const kategori = await this.prisma.kategoriSampah.findFirst({
      where: {
        id,
        appMakerId,
      },
    });

    if (!kategori) {
      throw new NotFoundException('Data kategori sampah tidak ditemukan');
    }

    return kategori;
  }

  async update(
    appMakerId: string,
    id: string,
    dto: UpdateKategoriSampahDto,
    fotoUrl?: string,
  ) {
    const existing = await this.prisma.kategoriSampah.findFirst({
      where: {
        id,
        appMakerId,
      },
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

  async remove(appMakerId: string, id: string) {
    const existing = await this.prisma.kategoriSampah.findFirst({
      where: {
        id,
        appMakerId,
      },
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
