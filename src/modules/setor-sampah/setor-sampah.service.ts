import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma.service.js';
import {
  CreateSetorSampahDto,
  VerifySetorSampahDto,
  QuerySetorSampahDto,
} from './dto/index.js';

@Injectable()
export class SetorSampahService {
  constructor(private readonly prisma: PrismaService) {}

  async createPengajuan(
    appMakerId: string,
    userId: string,
    dto: CreateSetorSampahDto,
  ) {
    const nasabah = await this.prisma.nasabah.findUnique({
      where: { userId },
    });

    if (!nasabah || nasabah.appMakerId !== appMakerId) {
      throw new NotFoundException('Data profil nasabah tidak ditemukan');
    }

    let totalBeratKg = 0;
    let estimasiTotalPoin = 0;
    const detailCreates: any[] = [];

    for (const item of dto.items) {
      const kategori = await this.prisma.kategoriSampah.findFirst({
        where: { id: item.kategoriSampahId, appMakerId },
      });

      if (!kategori) {
        throw new BadRequestException(
          `Kategori sampah dengan ID ${item.kategoriSampahId} tidak ditemukan pada bank sampah ini`,
        );
      }

      const subtotalPoin = Math.round(item.beratKg * kategori.poinPerKg);
      totalBeratKg += item.beratKg;
      estimasiTotalPoin += subtotalPoin;

      detailCreates.push({
        appMakerId,
        kategoriSampahId: item.kategoriSampahId,
        beratKg: item.beratKg,
        poinPerKg: kategori.poinPerKg,
        subtotalPoin,
      });
    }

    const tanggalSetor = dto.tanggal ? new Date(dto.tanggal) : new Date();
    const now = isNaN(tanggalSetor.getTime()) ? new Date() : tanggalSetor;
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomSuffix = randomUUID().replace(/-/g, '').substring(0, 4).toUpperCase();
    const kodeSetor = `STR-${year}${month}-${randomSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      const setor = await tx.setorSampah.create({
        data: {
          kodeSetor,
          appMakerId,
          nasabahId: nasabah.id,
          tanggal: now,
          totalBeratKg: Number(totalBeratKg.toFixed(2)),
          estimasiTotalPoin,
          status: 'menunggu_konfirmasi',
          catatan: dto.catatan?.trim() || null,
          detailSetor: {
            create: detailCreates,
          },
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
          detailSetor: {
            include: {
              kategoriSampah: true,
            },
          },
        },
      });

      return setor;
    });
  }

  async findMySetor(
    appMakerId: string,
    userId: string,
    query: QuerySetorSampahDto,
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

    return this.prisma.setorSampah.findMany({
      where,
      include: {
        detailSetor: {
          include: {
            kategoriSampah: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin(appMakerId: string, query: QuerySetorSampahDto) {
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

    return this.prisma.setorSampah.findMany({
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
        detailSetor: {
          include: {
            kategoriSampah: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(
    appMakerId: string,
    id: string,
    user: { role: string; userId?: string; id?: string; sub?: string },
  ) {
    const setor = await this.prisma.setorSampah.findFirst({
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
        detailSetor: {
          include: {
            kategoriSampah: true,
          },
        },
      },
    });

    if (!setor) {
      throw new NotFoundException('Data setor sampah tidak ditemukan');
    }

    if (user.role === 'NASABAH') {
      const currentUserId = user.userId || user.id || user.sub;
      if (setor.nasabah.userId !== currentUserId) {
        throw new NotFoundException('Data setor sampah tidak ditemukan');
      }
    }

    return setor;
  }

  async verify(appMakerId: string, id: string, dto: VerifySetorSampahDto) {
    const existing = await this.prisma.setorSampah.findFirst({
      where: { id, appMakerId },
      include: {
        detailSetor: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Data setor sampah tidak ditemukan');
    }

    if (existing.status === 'selesai' && dto.status !== 'selesai') {
      throw new BadRequestException(
        'Transaksi yang sudah berstatus selesai tidak dapat diubah kembali ke status lain',
      );
    }

    if (existing.status === 'ditolak') {
      throw new BadRequestException(
        'Transaksi yang sudah ditolak tidak dapat diubah kembali',
      );
    }

    const wasAlreadySelesai = existing.status === 'selesai';
    let totalBeratKgReal = existing.totalBeratKgReal;
    let totalPoinReal = existing.totalPoinReal;
    const detailUpdates: {
      id: string;
      beratKgReal: number;
      subtotalPoinReal: number;
    }[] = [];

    if (dto.itemsReal && dto.itemsReal.length > 0) {
      let calcBeratReal = 0;
      let calcPoinReal = 0;

      for (const itemReal of dto.itemsReal) {
        const detail = existing.detailSetor.find(
          (d) => d.kategoriSampahId === itemReal.kategoriSampahId,
        );
        if (detail) {
          const subtotalReal = Math.round(
            itemReal.beratKgReal * detail.poinPerKg,
          );
          calcBeratReal += itemReal.beratKgReal;
          calcPoinReal += subtotalReal;
          detailUpdates.push({
            id: detail.id,
            beratKgReal: itemReal.beratKgReal,
            subtotalPoinReal: subtotalReal,
          });
        }
      }
      totalBeratKgReal = Number(calcBeratReal.toFixed(2));
      totalPoinReal = calcPoinReal;
    }

    const pointsToAdd =
      totalPoinReal !== null && totalPoinReal !== undefined
        ? totalPoinReal
        : existing.estimasiTotalPoin;

    return this.prisma.$transaction(async (tx) => {
      for (const du of detailUpdates) {
        await tx.detailSetor.update({
          where: { id: du.id },
          data: {
            beratKgReal: du.beratKgReal,
            subtotalPoinReal: du.subtotalPoinReal,
          },
        });
      }

      if (dto.status === 'selesai' && !wasAlreadySelesai && pointsToAdd > 0) {
        await tx.nasabah.update({
          where: { id: existing.nasabahId },
          data: {
            saldoPoin: { increment: pointsToAdd },
          },
        });
      }

      const updated = await tx.setorSampah.update({
        where: { id },
        data: {
          status: dto.status,
          catatanAdmin:
            dto.catatanAdmin !== undefined
              ? dto.catatanAdmin.trim()
              : existing.catatanAdmin,
          totalBeratKgReal,
          totalPoinReal,
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
          detailSetor: {
            include: {
              kategoriSampah: true,
            },
          },
        },
      });

      return updated;
    });
  }
}
