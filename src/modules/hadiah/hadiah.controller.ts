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
import { HadiahService } from './hadiah.service.js';
import { CreateHadiahDto, UpdateHadiahDto } from './dto/index.js';
import {
  Public,
  Roles,
  ResponseMessage,
  StorageService,
} from '../../common/index.js';

const hadiahUploadDir = join(process.cwd(), 'uploads', 'hadiah');
if (!existsSync(hadiahUploadDir)) {
  mkdirSync(hadiahUploadDir, { recursive: true });
}

const ALLOWED_MIME_EXT_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const multerHadiahStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(hadiahUploadDir)) {
      mkdirSync(hadiahUploadDir, { recursive: true });
    }
    cb(null, hadiahUploadDir);
  },
  filename: (_req, file, cb) => {
    const rawExt = extname(file.originalname || '').toLowerCase();
    let safeExt = '.jpg';
    if (rawExt === '.png' || file.mimetype === 'image/png') {
      safeExt = '.png';
    } else if (rawExt === '.webp' || file.mimetype === 'image/webp') {
      safeExt = '.webp';
    } else if (
      rawExt === '.jpeg' ||
      rawExt === '.jpg' ||
      file.mimetype === 'image/jpeg'
    ) {
      safeExt = '.jpg';
    }
    const uniqueName = `${Date.now()}-${randomUUID()}${safeExt}`;
    cb(null, uniqueName);
  },
});

const multerHadiahOptions = {
  storage: multerHadiahStorage,
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

@ApiTags('Hadiah')
@Controller('api/v1/hadiah')
export class HadiahController {
  constructor(
    private readonly hadiahService: HadiahService,
    private readonly storageService: StorageService,
  ) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mendapatkan daftar katalog hadiah',
    description:
      'Menampilkan katalog item hadiah reward beserta jumlah poin yang dibutuhkan dan sisa stok.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar katalog hadiah berhasil dimuat',
  })
  @ResponseMessage('Daftar katalog hadiah berhasil dimuat')
  async findAll() {
    return this.hadiahService.findAll();
  }

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('foto', multerHadiahOptions))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Menambahkan item hadiah baru (Admin)',
    description:
      'Admin menambahkan item hadiah baru ke dalam katalog reward dengan poin yang dibutuhkan dan jumlah stok.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Hadiah berhasil ditambahkan',
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Hanya Admin yang berhak mengakses',
  })
  @ResponseMessage('Hadiah berhasil ditambahkan')
  async create(
    @Body() dto: CreateHadiahDto,
    @UploadedFile() file?: any,
  ) {
    let fotoUrl: string | undefined;
    if (file) {
      fotoUrl = await this.storageService.uploadFile('hadiah', file);
    }

    try {
      return await this.hadiahService.create(dto, fotoUrl);
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

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mendapatkan detail hadiah berdasarkan ID',
    description:
      'Menampilkan rincian informasi dan status ketersediaan item hadiah reward berdasarkan UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail hadiah berhasil dimuat',
  })
  @ApiResponse({
    status: 404,
    description: 'Data hadiah tidak ditemukan',
  })
  @ResponseMessage('Detail hadiah berhasil dimuat')
  async findOne(@Param('id') id: string) {
    return this.hadiahService.findOne(id);
  }

  @Roles('ADMIN')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('foto', multerHadiahOptions))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Memperbarui data hadiah (Admin)',
    description:
      'Admin memperbarui nama, deskripsi, poin yang dibutuhkan, stok, atau foto hadiah.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Hadiah berhasil diperbarui',
  })
  @ApiResponse({
    status: 404,
    description: 'Data hadiah tidak ditemukan',
  })
  @ResponseMessage('Hadiah berhasil diperbarui')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHadiahDto,
    @UploadedFile() file?: any,
  ) {
    let fotoUrl: string | undefined;
    if (file) {
      fotoUrl = await this.storageService.uploadFile('hadiah', file);
    }

    try {
      return await this.hadiahService.update(id, dto, fotoUrl);
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

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Menghapus item hadiah (Admin)',
    description:
      'Menghapus item hadiah dari katalog reward bank sampah.',
  })
  @ApiResponse({
    status: 200,
    description: 'Hadiah berhasil dihapus',
  })
  @ApiResponse({
    status: 404,
    description: 'Data hadiah tidak ditemukan',
  })
  @ResponseMessage('Hadiah berhasil dihapus')
  async remove(@Param('id') id: string) {
    return this.hadiahService.remove(id);
  }
}
