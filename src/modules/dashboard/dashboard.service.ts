import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const nasabah = await this.prisma.nasabah.findUnique({
      where: { userId },
    });

    if (!nasabah) {
      throw new NotFoundException('Data profil nasabah tidak ditemukan');
    }

    const setorSelesai = await this.prisma.setorSampah.findMany({
      where: {
        nasabahId: nasabah.id,
        status: 'selesai',
      },
      select: {
        totalBeratKg: true,
        totalBeratKgReal: true,
        estimasiTotalPoin: true,
        totalPoinReal: true,
      },
    });

    const penukaranList = await this.prisma.penukaranPoin.findMany({
      where: {
        nasabahId: nasabah.id,
      },
      select: {
        poinDigunakan: true,
      },
    });

    const transaksiTerakhirSetor = await this.prisma.setorSampah.findFirst({
      where: {
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
    });

    const transaksiTerakhirTukar = await this.prisma.penukaranPoin.findFirst({
      where: {
        nasabahId: nasabah.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        hadiah: true,
      },
    });

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

  async getStats() {
    const totalNasabah = await this.prisma.nasabah.count();
    const totalKategoriSampah = await this.prisma.kategoriSampah.count();
    const totalTransaksiSetor = await this.prisma.setorSampah.count();
    const totalHadiah = await this.prisma.hadiah.count();
    const setorSelesai = await this.prisma.setorSampah.findMany({
      where: { status: 'selesai' },
      select: {
        totalBeratKg: true,
        totalBeratKgReal: true,
        estimasiTotalPoin: true,
        totalPoinReal: true,
      },
    });

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
