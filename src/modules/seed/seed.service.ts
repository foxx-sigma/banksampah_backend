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

  async seedTenantData(appMakerId: string) {
    const saltRounds = 10;
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    return this.prisma.$transaction(async (tx) => {
      // 1. Bersihkan data lama pada tenant ini untuk mencegah bentrok unique username / foreign key
      await tx.detailSetor.deleteMany({ where: { appMakerId } });
      await tx.setorSampah.deleteMany({ where: { appMakerId } });
      await tx.penukaranPoin.deleteMany({ where: { appMakerId } });
      await tx.hadiah.deleteMany({ where: { appMakerId } });
      await tx.kategoriSampah.deleteMany({ where: { appMakerId } });
      await tx.nasabah.deleteMany({ where: { appMakerId } });
      await tx.adminBank.deleteMany({ where: { appMakerId } });
      await tx.user.deleteMany({ where: { appMakerId } });

      // 2. Buat Admin Bank
      const adminUser = await tx.user.create({
        data: {
          appMakerId,
          username: 'admin_bank',
          password: hashedPassword,
          role: Role.ADMIN,
          adminBank: {
            create: {
              appMakerId,
              namaUnit: 'Bank Sampah Unit Berkah',
              namaPengelola: 'Budi Santoso',
              telp: '081234567890',
            },
          },
        },
        include: { adminBank: true },
      });

      // 3. Buat 2 Nasabah Aktif dengan Saldo Berbeda
      const nasabahUser1 = await tx.user.create({
        data: {
          appMakerId,
          username: 'nasabah1',
          password: hashedPassword,
          role: Role.NASABAH,
          nasabah: {
            create: {
              appMakerId,
              namaNasabah: 'Andi Pratama',
              alamat: 'Jl. Merdeka No. 10',
              telp: '081298765432',
              tanggalLahir: new Date('1995-05-15'),
              saldoPoin: 750,
            },
          },
        },
        include: { nasabah: true },
      });

      const nasabahUser2 = await tx.user.create({
        data: {
          appMakerId,
          username: 'nasabah2',
          password: hashedPassword,
          role: Role.NASABAH,
          nasabah: {
            create: {
              appMakerId,
              namaNasabah: 'Siti Rahma',
              alamat: 'Jl. Mawar No. 5',
              telp: '081345678901',
              tanggalLahir: new Date('1998-08-20'),
              saldoPoin: 1500,
            },
          },
        },
        include: { nasabah: true },
      });

      // 4. Buat 4 Kategori Sampah (Plastik, Kertas, Logam, Kaca)
      const katPlastik = await tx.kategoriSampah.create({
        data: {
          appMakerId,
          namaKategori: 'Botol Plastik PET',
          hargaPerKg: 4000,
          poinPerKg: 200,
          jenis: JenisSampah.plastik,
        },
      });

      await tx.kategoriSampah.create({
        data: {
          appMakerId,
          namaKategori: 'Kardus Bekas',
          hargaPerKg: 2500,
          poinPerKg: 125,
          jenis: JenisSampah.kertas,
        },
      });

      await tx.kategoriSampah.create({
        data: {
          appMakerId,
          namaKategori: 'Kaleng Aluminium',
          hargaPerKg: 12000,
          poinPerKg: 600,
          jenis: JenisSampah.logam,
        },
      });

      await tx.kategoriSampah.create({
        data: {
          appMakerId,
          namaKategori: 'Botol Kaca Bening',
          hargaPerKg: 1500,
          poinPerKg: 75,
          jenis: JenisSampah.kaca,
        },
      });

      // 5. Buat 3 Katalog Hadiah
      const hadiah1 = await tx.hadiah.create({
        data: {
          appMakerId,
          namaHadiah: 'Tumbler Stainless Eco',
          deskripsi: 'Tumbler ramah lingkungan 500ml',
          poinDibutuhkan: 500,
          stok: 20,
        },
      });

      await tx.hadiah.create({
        data: {
          appMakerId,
          namaHadiah: 'Voucher Belanja Rp 50.000',
          deskripsi: 'Voucher belanja minimarket',
          poinDibutuhkan: 1000,
          stok: 10,
        },
      });

      await tx.hadiah.create({
        data: {
          appMakerId,
          namaHadiah: 'Payung Lipat Eksklusif',
          deskripsi: 'Payung lipat anti angin',
          poinDibutuhkan: 350,
          stok: 15,
        },
      });

      // 6. Buat 1 Transaksi Setor Sampah Status "selesai"
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const kodeSetor = `STR-${year}${month}-0001`;

      await tx.setorSampah.create({
        data: {
          kodeSetor,
          appMakerId,
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
              appMakerId,
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

      // 7. Buat 1 Transaksi Penukaran Poin Status "selesai"
      const kodePenukaran = `TKR-${year}${month}-0001`;

      await tx.penukaranPoin.create({
        data: {
          kodePenukaran,
          appMakerId,
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
    });
  }
}
