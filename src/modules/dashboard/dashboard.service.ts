import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(appMakerId: string, userId: string) {
    const nasabah = await this.prisma.nasabah.findUnique({
      where: { userId },
    });

    if (!nasabah || nasabah.appMakerId !== appMakerId) {
      throw new NotFoundException('Data profil nasabah tidak ditemukan');
    }

    const [setorSelesai, penukaranList, transaksiTerakhirSetor, transaksiTerakhirTukar] =
      await Promise.all([
        this.prisma.setorSampah.findMany({
          where: {
            appMakerId,
            nasabahId: nasabah.id,
            status: 'selesai',
          },
          select: {
            totalBeratKg: true,
            totalBeratKgReal: true,
            estimasiTotalPoin: true,
            totalPoinReal: true,
          },
        }),
        this.prisma.penukaranPoin.findMany({
          where: {
            appMakerId,
            nasabahId: nasabah.id,
          },
          select: {
            poinDigunakan: true,
          },
        }),
        this.prisma.setorSampah.findFirst({
          where: {
            appMakerId,
            nasabahId: nasabah.id,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            detailSetor: {
              include: {
                kategoriSampah: true,
              },
            },
          },
        }),
        this.prisma.penukaranPoin.findFirst({
          where: {
            appMakerId,
            nasabahId: nasabah.id,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            hadiah: true,
          },
        }),
      ]);

    let totalSampahDisetorKg = 0;
    let totalPoinDidapat = 0;

    for (const s of setorSelesai) {
      totalSampahDisetorKg += s.totalBeratKgReal ?? s.totalBeratKg;
      totalPoinDidapat += s.totalPoinReal ?? s.estimasiTotalPoin;
    }
    totalSampahDisetorKg = Math.round(totalSampahDisetorKg * 100) / 100;

    const totalPoinDitukar = penukaranList.reduce(
      (acc, curr) => acc + curr.poinDigunakan,
      0,
    );

    return {
      saldoPoinSaatIni: nasabah.saldoPoin,
      totalSampahDisetorKg,
      totalPoinDidapat,
      totalPoinDitukar,
      transaksiTerakhirSetor,
      transaksiTerakhirTukar,
    };
  }

  async getStats(appMakerId: string) {
    const [
      totalNasabah,
      totalKategoriSampah,
      totalTransaksiSetor,
      totalHadiah,
      setorSelesai,
    ] = await Promise.all([
      this.prisma.nasabah.count({ where: { appMakerId } }),
      this.prisma.kategoriSampah.count({ where: { appMakerId } }),
      this.prisma.setorSampah.count({ where: { appMakerId } }),
      this.prisma.hadiah.count({ where: { appMakerId } }),
      this.prisma.setorSampah.findMany({
        where: { appMakerId, status: 'selesai' },
        select: {
          totalBeratKg: true,
          totalBeratKgReal: true,
          estimasiTotalPoin: true,
          totalPoinReal: true,
        },
      }),
    ]);

    let totalBeratSampahKg = 0;
    let totalPoinTersalurkan = 0;

    for (const s of setorSelesai) {
      totalBeratSampahKg += s.totalBeratKgReal ?? s.totalBeratKg;
      totalPoinTersalurkan += s.totalPoinReal ?? s.estimasiTotalPoin;
    }
    totalBeratSampahKg = Math.round(totalBeratSampahKg * 100) / 100;

    return {
      totalNasabah,
      totalKategoriSampah,
      totalTransaksiSetor,
      totalHadiah,
      totalBeratSampahKg,
      totalPoinTersalurkan,
    };
  }
}
