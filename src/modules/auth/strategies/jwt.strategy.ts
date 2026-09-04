import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service.js';

export interface JwtAuthPayload {
  sub: string;
  userId?: string;
  username: string;
  role: 'NASABAH' | 'ADMIN' | 'MAKER';
  appMakerId: string;
}

@Injectable()
export class JwtStrategy {
  constructor(private readonly prisma: PrismaService) {}

  async validate(payload: JwtAuthPayload) {
    const userId = payload.userId || payload.sub;

    if (!userId) {
      throw new UnauthorizedException('Token payload tidak memuat identitas pengguna');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        nasabah: true,
        adminBank: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan dalam sistem');
    }

    if (payload.appMakerId && user.appMakerId !== payload.appMakerId) {
      throw new UnauthorizedException(
        'Sesi otentikasi tidak sesuai dengan App Key yang aktif',
      );
    }

    return user;
  }
}
