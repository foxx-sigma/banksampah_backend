import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma.service.js';
import {
  CreatePenukaranPoinDto,
  UpdateStatusPenukaranDto,
  QueryPenukaranPoinDto,
} from './dto/index.js';

@Injectable()
export class PenukaranPoinService {
  constructor(private readonly prisma: PrismaService) {}

  async tukarPoin(
    appMakerId: string,
    userId: string,
    dto: CreatePenukaranPoinDto,
  ) {
    const nasabah = await this.prisma.nasabah.findUnique({
      where: { userId },
    });

    if (!nasabah || nasabah.appMakerId !== appMakerId) {
      throw new NotFoundException('Data profil nasabah tidak ditemukan');
    }

    const hadiah = await this.prisma.hadiah.findFirst({
      where: { id: dto.hadiahId, appMakerId },
    });

    if (!hadiah) {
      throw new NotFoundException('Data hadiah tidak ditemukan');
    }

    if (hadiah.stok <= 0) {
      throw new BadRequestException(
        'Stok hadiah tidak mencukupi atau telah habis',
      );
    }

    if (nasabah.saldoPoin < hadiah.poinDibutuhkan) {
      throw new BadRequestException(
        'Saldo poin tidak mencukupi untuk menukar hadiah ini',
      );
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomSuffix = randomUUID()
      .replace(/-/g, '')
      .substring(0, 4)
      .toUpperCase();
    const kodePenukaran = `TKR-${year}${month}-${randomSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      await tx.nasabah.update({
        where: { id: nasabah.id },
        data: {
          saldoPoin: { decrement: hadiah.poinDibutuhkan },
        },
      });

      await tx.hadiah.update({
        where: { id: hadiah.id },
        data: {
          stok: { decrement: 1 },
        },
      });

      const penukaran = await tx.penukaranPoin.create({
        data: {
          kodePenukaran,
          appMakerId,
          nasabahId: nasabah.id,
          hadiahId: hadiah.id,
          poinDigunakan: hadiah.poinDibutuhkan,
          status: 'diproses',
          catatan: dto.catatan?.trim() || null,
          tanggal: now,
        },
        include: {
          nasabah: {
            select: {
              id: true,
              namaNasabah: true,
              alamat: true,
              telp: true,
              saldoPoin: true,
            },
          },
          hadiah: true,
        },
      });

      return penukaran;
    });
  }

  async findMyPenukaran(
    appMakerId: string,
    userId: string,
    query: QueryPenukaranPoinDto,
  ) {
    const nasabah = await this.prisma.nasabah.findUnique({
      where: { userId },
    });

    if (!nasabah || nasabah.appMakerId !== appMakerId) {
      throw new NotFoundException('Data profil nasabah tidak ditemukan');
    }

    const where: any = {
      appMakerId,
      nasabahId: nasabah.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.bulan && /^\d{4}-\d{2}$/.test(query.bulan)) {
      const [yStr, mStr] = query.bulan.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      where.tanggal = {
        gte: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)),
        lt: new Date(Date.UTC(y, m, 1, 0, 0, 0)),
      };
    }

    return this.prisma.penukaranPoin.findMany({
      where,
      include: {
        hadiah: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin(appMakerId: string, query: QueryPenukaranPoinDto) {
    const where: any = { appMakerId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.bulan && /^\d{4}-\d{2}$/.test(query.bulan)) {
      const [yStr, mStr] = query.bulan.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      where.tanggal = {
        gte: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)),
        lt: new Date(Date.UTC(y, m, 1, 0, 0, 0)),
      };
    }

    return this.prisma.penukaranPoin.findMany({
      where,
      include: {
        nasabah: {
          select: {
            id: true,
            namaNasabah: true,
            alamat: true,
            telp: true,
            saldoPoin: true,
          },
        },
        hadiah: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    appMakerId: string,
    id: string,
    dto: UpdateStatusPenukaranDto,
  ) {
    const existing = await this.prisma.penukaranPoin.findFirst({
      where: { id, appMakerId },
    });

    if (!existing) {
      throw new NotFoundException('Data penukaran poin tidak ditemukan');
    }

    return this.prisma.penukaranPoin.update({
      where: { id },
      data: {
        status: dto.status,
        catatan:
          dto.catatan !== undefined ? dto.catatan.trim() : existing.catatan,
      },
      include: {
        nasabah: {
          select: {
            id: true,
            namaNasabah: true,
            alamat: true,
            telp: true,
            saldoPoin: true,
          },
        },
        hadiah: true,
      },
    });
  }

  async getNota(
    appMakerId: string,
    id: string,
    user: { role: string; userId?: string; id?: string; sub?: string },
  ) {
    const penukaran = await this.prisma.penukaranPoin.findFirst({
      where: { id, appMakerId },
      include: {
        nasabah: {
          select: {
            id: true,
            userId: true,
            namaNasabah: true,
            alamat: true,
            telp: true,
            saldoPoin: true,
          },
        },
        hadiah: true,
      },
    });

    if (!penukaran) {
      throw new NotFoundException('Data penukaran poin tidak ditemukan');
    }

    if (user.role === 'NASABAH') {
      const currentUserId = user.userId || user.id || user.sub;
      if (penukaran.nasabah.userId !== currentUserId) {
        throw new NotFoundException('Data penukaran poin tidak ditemukan');
      }
    }

    return penukaran;
  }
}
