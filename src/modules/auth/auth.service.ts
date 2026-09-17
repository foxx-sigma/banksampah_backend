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
    dto: RegisterNasabahBankDto,
    fotoUrl?: string,
  ) {
    const username = dto.username.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException(
        'Username sudah terdaftar pada Bank Sampah ini',
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'NASABAH',
        nasabah: {
          create: {
            namaNasabah: dto.namaNasabah.trim(),
            alamat: dto.alamat.trim(),
            telp: dto.telp.trim(),
            foto: fotoUrl || null,
            saldoPoin: 0,
          },
        },
      },
      include: {
        nasabah: true,
      },
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      nasabah: {
        id: user.nasabah!.id,
        namaNasabah: user.nasabah!.namaNasabah,
        alamat: user.nasabah!.alamat,
        telp: user.nasabah!.telp,
        foto: user.nasabah!.foto,
        saldoPoin: user.nasabah!.saldoPoin,
        createdAt: user.nasabah!.createdAt,
        updatedAt: user.nasabah!.updatedAt,
      },
    };
  }

  async registerAdmin(dto: RegisterAdminBankDto) {
    const username = dto.username.trim();

    const existingAdmin = await this.prisma.adminBank.findFirst({});

    if (existingAdmin) {
      throw new ConflictException(
        'Admin Bank Sampah untuk unit ini sudah terdaftar',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException(
        'Username sudah terdaftar pada Bank Sampah ini',
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'ADMIN',
        adminBank: {
          create: {
            namaUnit: dto.namaUnit.trim(),
            namaPengelola: dto.namaPengelola.trim(),
            telp: dto.telp.trim(),
          },
        },
      },
      include: {
        adminBank: true,
      },
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      adminBank: {
        id: user.adminBank!.id,
        namaUnit: user.adminBank!.namaUnit,
        namaPengelola: user.adminBank!.namaPengelola,
        telp: user.adminBank!.telp,
        createdAt: user.adminBank!.createdAt,
        updatedAt: user.adminBank!.updatedAt,
      },
    };
  }

  async login(dto: LoginUserDto) {
    const username = dto.username.trim();

    const user = await this.prisma.user.findUnique({
      where: { username },
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
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
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

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        nasabah: true,
        adminBank: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const { password: _password, ...userProfile } = user;
    return userProfile;
  }
}
