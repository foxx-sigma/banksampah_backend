import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service.js';
import { StorageService } from '../../common/storage.service.js';
import { CreateNasabahDto, UpdateNasabahDto } from './dto/index.js';

@Injectable()
export class NasabahService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(appMakerId: string) {
    return this.prisma.nasabah.findMany({
      where: { appMakerId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    appMakerId: string,
    dto: CreateNasabahDto,
    fotoUrl?: string,
  ) {
    const username = dto.username.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: {
        appMakerId_username: {
          appMakerId,
          username,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Username sudah terdaftar pada Bank Sampah ini',
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    let tanggalLahir: Date | null = null;
    if (dto.tanggalLahir) {
      const parsed = new Date(dto.tanggalLahir);
      if (!isNaN(parsed.getTime())) {
        tanggalLahir = parsed;
      }
    }

    const nama = (dto.namaNasabah || dto.namaLengkap || '').trim();
    const telp = (dto.telp || dto.noTelepon || '').trim();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          appMakerId,
          username,
          password: hashedPassword,
          role: 'NASABAH',
        },
      });

      const nasabah = await tx.nasabah.create({
        data: {
          appMakerId,
          userId: user.id,
          namaNasabah: nama,
          alamat: dto.alamat.trim(),
          telp,
          tanggalLahir,
          foto: fotoUrl || null,
          saldoPoin: 0,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return nasabah;
    });
  }

  async findOne(appMakerId: string, id: string) {
    const nasabah = await this.prisma.nasabah.findFirst({
      where: {
        id,
        appMakerId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!nasabah) {
      throw new NotFoundException('Data nasabah tidak ditemukan');
    }

    return nasabah;
  }

  async update(
    appMakerId: string,
    id: string,
    dto: UpdateNasabahDto,
    fotoUrl?: string,
  ) {
    const existing = await this.prisma.nasabah.findFirst({
      where: {
        id,
        appMakerId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Data nasabah tidak ditemukan');
    }

    const updateData: any = {};
    const nama = dto.namaNasabah || dto.namaLengkap;
    if (nama !== undefined) {
      updateData.namaNasabah = nama.trim();
    }
    const telp = dto.telp || dto.noTelepon;
    if (telp !== undefined) {
      updateData.telp = telp.trim();
    }
    if (dto.alamat !== undefined) {
      updateData.alamat = dto.alamat.trim();
    }
    if (dto.tanggalLahir !== undefined) {
      const parsed = new Date(dto.tanggalLahir);
      updateData.tanggalLahir = !isNaN(parsed.getTime()) ? parsed : null;
    }
    if (fotoUrl !== undefined) {
      updateData.foto = fotoUrl;
    }

    const updated = await this.prisma.nasabah.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (fotoUrl && existing.foto && existing.foto !== fotoUrl) {
      await this.storageService.deleteFile(existing.foto).catch(() => {});
    }

    return updated;
  }

  async remove(appMakerId: string, id: string) {
    const existing = await this.prisma.nasabah.findFirst({
      where: {
        id,
        appMakerId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Data nasabah tidak ditemukan');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.nasabah.delete({
        where: { id },
      });
      await tx.user.delete({
        where: { id: existing.userId },
      });
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
