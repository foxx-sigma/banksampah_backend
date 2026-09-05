import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service.js';
import {
  RegisterNasabahBankDto,
  RegisterAdminBankDto,
  LoginUserDto,
} from './dto/index.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerNasabah(
    appMakerId: string,
    dto: RegisterNasabahBankDto,
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
          namaNasabah: dto.namaNasabah.trim(),
          alamat: dto.alamat.trim(),
          telp: dto.telp.trim(),
          foto: fotoUrl || null,
          saldoPoin: 0,
        },
      });

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        appMakerId: user.appMakerId,
        nasabah: {
          id: nasabah.id,
          namaNasabah: nasabah.namaNasabah,
          alamat: nasabah.alamat,
          telp: nasabah.telp,
          foto: nasabah.foto,
          saldoPoin: nasabah.saldoPoin,
          createdAt: nasabah.createdAt,
          updatedAt: nasabah.updatedAt,
        },
      };
    });
  }

  async registerAdmin(appMakerId: string, dto: RegisterAdminBankDto) {
    const username = dto.username.trim();

    const existingAdmin = await this.prisma.adminBank.findFirst({
      where: { appMakerId },
    });

    if (existingAdmin) {
      throw new ConflictException(
        'Admin Bank Sampah untuk unit ini sudah terdaftar',
      );
    }

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

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          appMakerId,
          username,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      const adminBank = await tx.adminBank.create({
        data: {
          appMakerId,
          userId: user.id,
          namaUnit: dto.namaUnit.trim(),
          namaPengelola: dto.namaPengelola.trim(),
          telp: dto.telp.trim(),
        },
      });

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        appMakerId: user.appMakerId,
        adminBank: {
          id: adminBank.id,
          namaUnit: adminBank.namaUnit,
          namaPengelola: adminBank.namaPengelola,
          telp: adminBank.telp,
          createdAt: adminBank.createdAt,
          updatedAt: adminBank.updatedAt,
        },
      };
    });
  }

  async login(appMakerId: string, dto: LoginUserDto) {
    const username = dto.username.trim();

    const user = await this.prisma.user.findUnique({
      where: {
        appMakerId_username: {
          appMakerId,
          username,
        },
      },
      include: {
        nasabah: true,
        adminBank: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const payload = {
      sub: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      appMakerId: user.appMakerId,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        appMakerId: user.appMakerId,
        nasabah: user.nasabah
          ? {
              id: user.nasabah.id,
              namaNasabah: user.nasabah.namaNasabah,
              alamat: user.nasabah.alamat,
              telp: user.nasabah.telp,
              foto: user.nasabah.foto,
              saldoPoin: user.nasabah.saldoPoin,
            }
          : undefined,
        adminBank: user.adminBank
          ? {
              id: user.adminBank.id,
              namaUnit: user.adminBank.namaUnit,
              namaPengelola: user.adminBank.namaPengelola,
              telp: user.adminBank.telp,
            }
          : undefined,
      },
    };
  }

  async getMe(appMakerId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        nasabah: true,
        adminBank: true,
      },
    });

    if (!user || user.appMakerId !== appMakerId) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const { password: _password, ...userProfile } = user;
    return userProfile;
  }
}
