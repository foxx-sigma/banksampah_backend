import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { StorageService } from '../../common/storage.service.js';
import { CreateHadiahDto, UpdateHadiahDto } from './dto/index.js';

@Injectable()
export class HadiahService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findAll() {
    return this.prisma.hadiah.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateHadiahDto, fotoUrl?: string) {
    return this.prisma.hadiah.create({
      data: {
        namaHadiah: dto.namaHadiah.trim(),
        deskripsi: dto.deskripsi?.trim() || null,
        poinDibutuhkan: dto.poinDibutuhkan,
        stok: dto.stok,
        foto: fotoUrl || null,
      },
    });
  }

  async findOne(id: string) {
    const hadiah = await this.prisma.hadiah.findFirst({
      where: { id },
    });

    if (!hadiah) {
      throw new NotFoundException('Data hadiah tidak ditemukan');
    }

    return hadiah;
  }

  async update(
    id: string,
    dto: UpdateHadiahDto,
    fotoUrl?: string,
  ) {
    const existing = await this.prisma.hadiah.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Data hadiah tidak ditemukan');
    }

    const updateData: any = {};
    if (dto.namaHadiah !== undefined) {
      updateData.namaHadiah = dto.namaHadiah.trim();
    }
    if (dto.deskripsi !== undefined) {
      updateData.deskripsi = dto.deskripsi.trim();
    }
    if (dto.poinDibutuhkan !== undefined) {
      updateData.poinDibutuhkan = dto.poinDibutuhkan;
    }
    if (dto.stok !== undefined) {
      updateData.stok = dto.stok;
    }
    if (fotoUrl !== undefined) {
      updateData.foto = fotoUrl;
    }

    const updated = await this.prisma.hadiah.update({
      where: { id },
      data: updateData,
    });

    if (fotoUrl && existing.foto && existing.foto !== fotoUrl) {
      await this.storageService.deleteFile(existing.foto).catch(() => {});
    }

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.hadiah.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Data hadiah tidak ditemukan');
    }

    await this.prisma.hadiah.delete({
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
