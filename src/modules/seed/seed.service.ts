import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import {
  Role,
  JenisSampah,
  StatusSetor,
  StatusPenukaran,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma.service.js';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async seedData() {
    const saltRounds = 10;
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    await this.prisma.detailSetor.deleteMany({});
    await this.prisma.setorSampah.deleteMany({});
    await this.prisma.penukaranPoin.deleteMany({});
    await this.prisma.hadiah.deleteMany({});
    await this.prisma.kategoriSampah.deleteMany({});
    await this.prisma.nasabah.deleteMany({});
    await this.prisma.adminBank.deleteMany({});
    await this.prisma.user.deleteMany({});

    const [adminUser, nasabahUser1, nasabahUser2] = await Promise.all([
      this.prisma.user.create({
        data: {
          username: 'admin_bank',
          password: hashedPassword,
          role: Role.ADMIN,
          adminBank: {
            create: {
              namaUnit: 'Bank Sampah Unit Berkah',
              namaPengelola: 'Budi Santoso',
              telp: '081234567890',
            },
          },
        },
        include: { adminBank: true },
      }),
      this.prisma.user.create({
        data: {
          username: 'nasabah1',
          password: hashedPassword,
          role: Role.NASABAH,
          nasabah: {
            create: {
              namaNasabah: 'Andi Pratama',
              alamat: 'Jl. Merdeka No. 10',
              telp: '081298765432',
              tanggalLahir: new Date('1995-05-15'),
              saldoPoin: 750,
            },
          },
        },
        include: { nasabah: true },
      }),
      this.prisma.user.create({
        data: {
          username: 'nasabah2',
          password: hashedPassword,
          role: Role.NASABAH,
          nasabah: {
            create: {
              namaNasabah: 'Siti Rahma',
              alamat: 'Jl. Mawar No. 5',
              telp: '081345678901',
              tanggalLahir: new Date('1998-08-20'),
              saldoPoin: 1500,
            },
          },
        },
        include: { nasabah: true },
      }),
    ]);

    const [katPlastik] = await Promise.all([
      this.prisma.kategoriSampah.create({
        data: {
          namaKategori: 'Botol Plastik PET',
          hargaPerKg: 4000,
          poinPerKg: 200,
          jenis: JenisSampah.plastik,
        },
      }),
      this.prisma.kategoriSampah.create({
        data: {
          namaKategori: 'Kardus Bekas',
          hargaPerKg: 2500,
          poinPerKg: 125,
          jenis: JenisSampah.kertas,
        },
      }),
      this.prisma.kategoriSampah.create({
        data: {
          namaKategori: 'Kaleng Aluminium',
          hargaPerKg: 12000,
          poinPerKg: 600,
          jenis: JenisSampah.logam,
        },
      }),
      this.prisma.kategoriSampah.create({
        data: {
          namaKategori: 'Botol Kaca Bening',
          hargaPerKg: 1500,
          poinPerKg: 75,
          jenis: JenisSampah.kaca,
        },
      }),
    ]);

    const [hadiah1] = await Promise.all([
      this.prisma.hadiah.create({
        data: {
          namaHadiah: 'Tumbler Stainless Eco',
          deskripsi: 'Tumbler ramah lingkungan 500ml',
          poinDibutuhkan: 500,
          stok: 20,
        },
      }),
      this.prisma.hadiah.create({
        data: {
          namaHadiah: 'Voucher Belanja Rp 50.000',
          deskripsi: 'Voucher belanja minimarket',
          poinDibutuhkan: 1000,
          stok: 10,
        },
      }),
      this.prisma.hadiah.create({
        data: {
          namaHadiah: 'Payung Lipat Eksklusif',
          deskripsi: 'Payung lipat anti angin',
          poinDibutuhkan: 350,
          stok: 15,
        },
      }),
    ]);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const kodeSetor = `STR-${year}${month}-0001`;

    await this.prisma.setorSampah.create({
      data: {
        kodeSetor,
        nasabahId: nasabahUser1.nasabah!.id,
        tanggal: now,
        totalBeratKg: 5.0,
        totalBeratKgReal: 5.0,
        estimasiTotalPoin: 1000,
        totalPoinReal: 1000,
        status: StatusSetor.selesai,
        catatan: 'Setoran perdana botol plastik',
        catatanAdmin: 'Selesai diverifikasi dan ditimbang admin',
        detailSetor: {
          create: {
            kategoriSampahId: katPlastik.id,
            beratKg: 5.0,
            beratKgReal: 5.0,
            poinPerKg: 200,
            subtotalPoin: 1000,
            subtotalPoinReal: 1000,
          },
        },
      },
    });

    const kodePenukaran = `TKR-${year}${month}-0001`;

    await this.prisma.penukaranPoin.create({
      data: {
        kodePenukaran,
        nasabahId: nasabahUser1.nasabah!.id,
        hadiahId: hadiah1.id,
        poinDigunakan: 500,
        status: StatusPenukaran.selesai,
        tanggal: now,
        catatan: 'Penukaran tumbler perdana',
      },
    });

    return {
      kredensial: {
        admin: {
          username: adminUser.username,
          password: defaultPassword,
          namaUnit: adminUser.adminBank?.namaUnit,
          role: 'ADMIN',
        },
        nasabah: [
          {
            username: nasabahUser1.username,
            password: defaultPassword,
            namaNasabah: nasabahUser1.nasabah?.namaNasabah,
            saldoPoin: nasabahUser1.nasabah?.saldoPoin,
            role: 'NASABAH',
          },
          {
            username: nasabahUser2.username,
            password: defaultPassword,
            namaNasabah: nasabahUser2.nasabah?.namaNasabah,
            saldoPoin: nasabahUser2.nasabah?.saldoPoin,
            role: 'NASABAH',
          },
        ],
      },
      ringkasanData: {
        totalAdmin: 1,
        totalNasabah: 2,
        totalKategoriSampah: 4,
        totalHadiah: 3,
        totalTransaksiSetor: 1,
        totalTransaksiPenukaran: 1,
      },
    };
  }
}
