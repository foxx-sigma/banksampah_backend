import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service.js';
import { RegisterAppMakerDto, LoginAppMakerDto } from './dto/index.js';

@Injectable()
export class AppMakerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterAppMakerDto) {
    const email = dto.email.toLowerCase().trim();

    const existingMaker = await this.prisma.appMaker.findUnique({
      where: { email },
    });

    if (existingMaker) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
    const appKey = randomUUID();

    const appMaker = await this.prisma.appMaker.create({
      data: {
        email,
        password: hashedPassword,
        namaSiswa: dto.namaSiswa.trim(),
        kelas: dto.kelas.trim(),
        namaApp: dto.namaApp.trim(),
        appKey,
      },
      select: {
        id: true,
        email: true,
        namaSiswa: true,
        kelas: true,
        namaApp: true,
        appKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return appMaker;
  }

  async login(dto: LoginAppMakerDto) {
    const email = dto.email.toLowerCase().trim();

    const appMaker = await this.prisma.appMaker.findUnique({
      where: { email },
    });

    if (!appMaker) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      appMaker.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const payload = {
      sub: appMaker.id,
      appMakerId: appMaker.id,
      email: appMaker.email,
      role: 'MAKER',
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      accessToken: token,
      appKey: appMaker.appKey,
      maker: {
        id: appMaker.id,
        email: appMaker.email,
        namaSiswa: appMaker.namaSiswa,
        kelas: appMaker.kelas,
        namaApp: appMaker.namaApp,
      },
    };
  }

  async getProfile(appMakerId: string) {
    const appMaker = await this.prisma.appMaker.findUnique({
      where: { id: appMakerId },
      select: {
        id: true,
        email: true,
        namaSiswa: true,
        kelas: true,
        namaApp: true,
        appKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!appMaker) {
      throw new NotFoundException('App Maker tidak ditemukan');
    }

    const [
      totalNasabah,
      totalKategoriSampah,
      totalTransaksiSetor,
      totalHadiah,
    ] = await Promise.all([
      this.prisma.nasabah.count({ where: { appMakerId } }),
      this.prisma.kategoriSampah.count({ where: { appMakerId } }),
      this.prisma.setorSampah.count({ where: { appMakerId } }),
      this.prisma.hadiah.count({ where: { appMakerId } }),
    ]);

    return {
      ...appMaker,
      totalNasabah,
      totalKategoriSampah,
      totalTransaksiSetor,
      totalHadiah,
      statistik: {
        totalNasabah,
        totalKategoriSampah,
        totalTransaksiSetor,
        totalHadiah,
      },
    };
  }

  async checkKey(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const appMaker = await this.prisma.appMaker.findUnique({
      where: { email: normalizedEmail },
      select: {
        email: true,
        appKey: true,
        namaSiswa: true,
        namaApp: true,
      },
    });

    if (!appMaker) {
      throw new NotFoundException(
        'App Maker dengan email tersebut tidak ditemukan',
      );
    }

    return appMaker;
  }
}
