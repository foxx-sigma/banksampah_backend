import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { RekapitulasiQueryDto } from './dto/index.js';

@Injectable()
export class RekapitulasiService {
  constructor(private readonly prisma: PrismaService) {}

  async getRekapitulasiBulanan(
    appMakerId: string,
    query: RekapitulasiQueryDto,
  ) {
    if (!query.bulan || !/^\d{4}-\d{2}$/.test(query.bulan)) {
      throw new BadRequestException(
        'Parameter bulan wajib diisi dengan format YYYY-MM',
      );
    }

    const [yearStr, monthStr] = query.bulan.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const setorSelesai = await this.prisma.setorSampah.findMany({
      where: {
        appMakerId,
        status: 'selesai',
        tanggal: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        detailSetor: {
          include: {
            kategoriSampah: true,
          },
        },
      },
    });

    let totalKg = 0;
    let totalEstimasiPembayaranRupiah = 0;
    let totalPoinDiterbitkan = 0;

    const breakdownJenisSampah: Record<
      string,
      { tonaseKg: number; rupiah: number; poin: number }
    > = {
      plastik: { tonaseKg: 0, rupiah: 0, poin: 0 },
      kertas: { tonaseKg: 0, rupiah: 0, poin: 0 },
      logam: { tonaseKg: 0, rupiah: 0, poin: 0 },
      kaca: { tonaseKg: 0, rupiah: 0, poin: 0 },
    };

    for (const setor of setorSelesai) {
      for (const detail of setor.detailSetor) {
        const berat =
          detail.beratKgReal !== null && detail.beratKgReal !== undefined
            ? detail.beratKgReal
            : detail.beratKg;

        const poin =
          detail.subtotalPoinReal !== null &&
          detail.subtotalPoinReal !== undefined
            ? detail.subtotalPoinReal
            : detail.subtotalPoin;

        const hargaPerKg = detail.kategoriSampah?.hargaPerKg || 0;
        const rupiah = Math.round(berat * hargaPerKg);

        totalKg += berat;
        totalEstimasiPembayaranRupiah += rupiah;
        totalPoinDiterbitkan += poin;

        const jenis = detail.kategoriSampah?.jenis;
        if (jenis && breakdownJenisSampah[jenis]) {
          breakdownJenisSampah[jenis].tonaseKg += berat;
          breakdownJenisSampah[jenis].rupiah += rupiah;
          breakdownJenisSampah[jenis].poin += poin;
        }
      }
    }

    totalKg = Number(totalKg.toFixed(2));
    const totalTon = Number((totalKg / 1000).toFixed(4));

    for (const key of Object.keys(breakdownJenisSampah)) {
      breakdownJenisSampah[key].tonaseKg = Number(
        breakdownJenisSampah[key].tonaseKg.toFixed(2),
      );
    }

    const penukaranSelesai = await this.prisma.penukaranPoin.findMany({
      where: {
        appMakerId,
        status: 'selesai',
        tanggal: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalTransaksiPenukaran = penukaranSelesai.length;
    const totalPoinTerpakai = penukaranSelesai.reduce(
      (sum, item) => sum + (item.poinDigunakan || 0),
      0,
    );

    return {
      bulan: query.bulan,
      rekapitulasiTonase: {
        totalKg,
        totalTon,
        totalEstimasiPembayaranRupiah,
        totalPoinDiterbitkan,
      },
      breakdownJenisSampah,
      rekapitulasiPenukaranPoin: {
        totalTransaksiPenukaran,
        totalPoinTerpakai,
      },
    };
  }
}
