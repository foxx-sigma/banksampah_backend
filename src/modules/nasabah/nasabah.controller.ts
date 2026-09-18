import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { NasabahService } from './nasabah.service.js';
import { CreateNasabahDto, UpdateNasabahDto } from './dto/index.js';
import {
  Roles,
  ResponseMessage,
  StorageService,
} from '../../common/index.js';

const nasabahUploadDir = join(process.cwd(), 'uploads', 'nasabah');
if (!existsSync(nasabahUploadDir)) {
  mkdirSync(nasabahUploadDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const multerNasabahStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(nasabahUploadDir)) {
      mkdirSync(nasabahUploadDir, { recursive: true });
    }
    cb(null, nasabahUploadDir);
  },
  filename: (_req, file, cb) => {
    const rawExt = extname(file.originalname || '').toLowerCase();
    let safeExt = '.jpg';
    if (rawExt === '.png' || file.mimetype === 'image/png') {
      safeExt = '.png';
    } else if (rawExt === '.webp' || file.mimetype === 'image/webp') {
      safeExt = '.webp';
    } else if (rawExt === '.jpeg' || rawExt === '.jpg' || file.mimetype === 'image/jpeg') {
      safeExt = '.jpg';
    }
    const uniqueName = `${Date.now()}-${randomUUID()}${safeExt}`;
    cb(null, uniqueName);
  },
});

const multerNasabahOptions = {
  storage: multerNasabahStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const rawExt = extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(rawExt)) {
      return cb(
        new BadRequestException(
          'Format file foto tidak didukung (hanya JPG, PNG, atau WEBP)',
        ),
        false,
      );
    }
    cb(null, true);
  },
};

@ApiTags('Admin Nasabah')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/admin/nasabah')
@Roles('ADMIN')
export class NasabahController {
  constructor(
    private readonly nasabahService: NasabahService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mendapatkan daftar seluruh data nasabah (Admin)',
    description:
      'Menampilkan daftar seluruh nasabah yang terdaftar pada unit bank sampah ini.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar data nasabah berhasil dimuat',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token tidak valid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Hanya Admin yang berhak mengakses',
  })
  @ResponseMessage('Daftar data nasabah berhasil dimuat')
  async findAll() {
    return this.nasabahService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('foto', multerNasabahOptions))
  @ApiOperation({
    summary: 'Menambahkan nasabah baru (Admin)',
    description:
      'Admin membuatkan akun nasabah baru beserta opsional file foto profil.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Data nasabah berhasil ditambahkan',
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
  })
  @ApiResponse({
    status: 409,
    description: 'Username sudah terdaftar pada bank sampah ini',
  })
  @ResponseMessage('Data nasabah berhasil ditambahkan')
  async create(
    @Body() dto: CreateNasabahDto,
    @UploadedFile() file?: any,
  ) {
    let fotoUrl: string | undefined;
    if (file) {
      fotoUrl = await this.storageService.uploadFile('nasabah', file);
    }

    try {
      return await this.nasabahService.create(dto, fotoUrl);
    } catch (error) {
      if (file?.path && existsSync(file.path)) {
        try {
          await unlink(file.path);
        } catch {
          // ignore cleanup error
        }
      }
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mendapatkan detail data nasabah berdasarkan ID (Admin)',
    description:
      'Menampilkan rincian data profil dan saldo poin nasabah berdasarkan UUID nasabah.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail data nasabah berhasil dimuat',
  })
  @ApiResponse({
    status: 404,
    description: 'Data nasabah tidak ditemukan',
  })
  @ResponseMessage('Detail data nasabah berhasil dimuat')
  async findOne(@Param('id') id: string) {
    return this.nasabahService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('foto', multerNasabahOptions))
  @ApiOperation({
    summary: 'Memperbarui data nasabah (Admin)',
    description:
      'Memperbarui data profil nasabah dan opsional memperbarui file foto profil.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Data nasabah berhasil diperbarui',
  })
  @ApiResponse({
    status: 404,
    description: 'Data nasabah tidak ditemukan',
  })
  @ResponseMessage('Data nasabah berhasil diperbarui')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNasabahDto,
    @UploadedFile() file?: any,
  ) {
    let fotoUrl: string | undefined;
    if (file) {
      fotoUrl = await this.storageService.uploadFile('nasabah', file);
    }

    try {
      return await this.nasabahService.update(id, dto, fotoUrl);
    } catch (error) {
      if (file?.path && existsSync(file.path)) {
        try {
          await unlink(file.path);
        } catch {
          // ignore cleanup error
        }
      }
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Menghapus data nasabah (Admin)',
    description:
      'Menghapus data nasabah dan akun login user terkait secara permanen dari sistem.',
  })
  @ApiResponse({
    status: 200,
    description: 'Data nasabah berhasil dihapus',
  })
  @ApiResponse({
    status: 404,
    description: 'Data nasabah tidak ditemukan',
  })
  @ResponseMessage('Data nasabah berhasil dihapus')
  async remove(@Param('id') id: string) {
    return this.nasabahService.remove(id);
  }
}
