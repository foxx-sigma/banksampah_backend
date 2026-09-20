import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service.js';
import { StorageService } from '../../common/storage.service.js';
import { CreateNasabahDto, UpdateNasabahDto, QueryNasabahDto } from './dto/index.js';

@Injectable()
export class NasabahService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query?: QueryNasabahDto) {
    if (
      !query ||
      (query.search === undefined &&
        query.page === undefined &&
        query.limit === undefined)
    ) {
      return this.prisma.nasabah.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const { search, page = 1, limit = 10 } = query;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { namaNasabah: { contains: search, mode: 'insensitive' as const } },
        { user: { username: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.nasabah.count({ where }),
      this.prisma.nasabah.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return { data, meta };
  }

  async create(
    dto: CreateNasabahDto,
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

    let tanggalLahir: Date | null = null;
    if (dto.tanggalLahir) {
      const parsed = new Date(dto.tanggalLahir);
      if (!isNaN(parsed.getTime())) {
        tanggalLahir = parsed;
      }
    }

    const nama = (dto.namaNasabah || '').trim();
    const telp = (dto.telp || '').trim();

    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'NASABAH',
        nasabah: {
          create: {
            namaNasabah: nama,
            alamat: dto.alamat.trim(),
            telp,
            tanggalLahir,
            foto: fotoUrl || null,
            saldoPoin: 0,
          },
        },
      },
      include: {
        nasabah: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    return user.nasabah!;
  }

  async findOne(id: string) {
    const nasabah = await this.prisma.nasabah.findFirst({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!nasabah) {
      throw new NotFoundException('Data nasabah tidak ditemukan');
    }

    return nasabah;
  }

  async update(
    id: string,
    dto: UpdateNasabahDto,
    fotoUrl?: string,
  ) {
    const existing = await this.prisma.nasabah.findFirst({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      throw new NotFoundException('Data nasabah tidak ditemukan');
    }

    // Handle user credential updates
    const userUpdateData: any = {};
    if (dto.username !== undefined && dto.username.trim() !== '') {
      const trimmedUsername = dto.username.trim();
      if (trimmedUsername !== existing.user.username) {
        const usernameTaken = await this.prisma.user.findFirst({
          where: {
            username: trimmedUsername,
            NOT: { id: existing.userId },
          },
        });
        if (usernameTaken) {
          throw new ConflictException('Username sudah digunakan oleh akun lain');
        }
        userUpdateData.username = trimmedUsername;
      }
    }

    if (dto.password !== undefined && dto.password.trim() !== '') {
      const saltRounds = 10;
      userUpdateData.password = await bcrypt.hash(dto.password, saltRounds);
    }

    if (Object.keys(userUpdateData).length > 0) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: userUpdateData,
      });
    }

    const updateData: any = {};
    if (dto.namaNasabah !== undefined) {
      updateData.namaNasabah = dto.namaNasabah.trim();
    }
    if (dto.telp !== undefined) {
      updateData.telp = dto.telp.trim();
    }
    if (dto.alamat !== undefined) {
      updateData.alamat = dto.alamat.trim();
    }
    if (dto.tanggalLahir !== undefined) {
      const parsed = new Date(dto.tanggalLahir);
      updateData.tanggalLahir = !isNaN(parsed.getTime()) ? parsed : null;
    }
    if (fotoUrl !== undefined) {
      updateData.foto = fotoUrl;
    }

    const updated = await this.prisma.nasabah.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (fotoUrl && existing.foto && existing.foto !== fotoUrl) {
      await this.storageService.deleteFile(existing.foto).catch(() => {});
    }

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.nasabah.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Data nasabah tidak ditemukan');
    }

    await this.prisma.user.delete({
      where: { id: existing.userId },
    });

    if (existing.foto) {
      await this.storageService.deleteFile(existing.foto).catch(() => {});
    }

    return {
      id,
      deleted: true,
    };
  }
}
