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
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { KategoriSampahService } from './kategori-sampah.service.js';
import {
  CreateKategoriSampahDto,
  UpdateKategoriSampahDto,
} from './dto/index.js';
import {
  Public,
  Roles,
  AppKeyGuard,
  JwtAuthGuard,
  RolesGuard,
  ResponseMessage,
  CurrentAppMaker,
  StorageService,
} from '../../common/index.js';

const sampahUploadDir = join(process.cwd(), 'uploads', 'kategori-sampah');
if (!existsSync(sampahUploadDir)) {
  mkdirSync(sampahUploadDir, { recursive: true });
}

const ALLOWED_MIME_EXT_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const multerSampahStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(sampahUploadDir)) {
      mkdirSync(sampahUploadDir, { recursive: true });
    }
    cb(null, sampahUploadDir);
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

const multerSampahOptions = {
  storage: multerSampahStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const rawExt = extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (
      !ALLOWED_EXTENSIONS.has(rawExt) ||
      !ALLOWED_MIME_EXT_MAP[mime] ||
      !ALLOWED_MIME_EXT_MAP[mime].includes(rawExt)
    ) {
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

@ApiTags('Kategori Sampah')
@ApiHeader({
  name: 'x-app-key',
  description: 'Tenant App Key yang valid',
  required: true,
})
@Controller('api/v1/kategori-sampah')
export class KategoriSampahController {
  constructor(
    private readonly kategoriSampahService: KategoriSampahService,
    private readonly storageService: StorageService,
  ) {}

  @Public()
  @UseGuards(AppKeyGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mendapatkan seluruh katalog kategori sampah',
    description:
      'Menampilkan daftar jenis sampah, harga per kg, poin per kg, dan kelompok kategori.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar kategori sampah berhasil dimuat',
  })
  @ResponseMessage('Daftar kategori sampah berhasil dimuat')
  async findAll(@CurrentAppMaker('id') appMakerId: string) {
    return this.kategoriSampahService.findAll(appMakerId);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('foto', multerSampahOptions))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Menambahkan kategori sampah baru (Admin)',
    description:
      'Admin menambahkan jenis sampah baru dengan harga, poin, kelompok jenis, dan opsional foto.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Kategori sampah berhasil ditambahkan',
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Hanya Admin yang berhak mengakses',
  })
  @ResponseMessage('Kategori sampah berhasil ditambahkan')
  async create(
    @CurrentAppMaker('id') appMakerId: string,
    @Body() dto: CreateKategoriSampahDto,
    @UploadedFile() file?: any,
  ) {
    let fotoUrl: string | undefined;
    if (file) {
      fotoUrl = await this.storageService.uploadFile('kategori-sampah', file);
    }

    try {
      return await this.kategoriSampahService.create(appMakerId, dto, fotoUrl);
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
  @UseGuards(AppKeyGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mendapatkan detail kategori sampah berdasarkan ID',
    description:
      'Menampilkan rincian kategori sampah berdasarkan UUID kategori.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail kategori sampah berhasil dimuat',
  })
  @ApiResponse({
    status: 404,
    description: 'Data kategori sampah tidak ditemukan',
  })
  @ResponseMessage('Detail kategori sampah berhasil dimuat')
  async findOne(
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
  ) {
    return this.kategoriSampahService.findOne(appMakerId, id);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('foto', multerSampahOptions))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Memperbarui kategori sampah (Admin)',
    description:
      'Admin memperbarui informasi harga, poin, kelompok, atau foto kategori sampah.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Kategori sampah berhasil diperbarui',
  })
  @ApiResponse({
    status: 404,
    description: 'Data kategori sampah tidak ditemukan',
  })
  @ResponseMessage('Kategori sampah berhasil diperbarui')
  async update(
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateKategoriSampahDto,
    @UploadedFile() file?: any,
  ) {
    let fotoUrl: string | undefined;
    if (file) {
      fotoUrl = await this.storageService.uploadFile('kategori-sampah', file);
    }

    try {
      return await this.kategoriSampahService.update(
        appMakerId,
        id,
        dto,
        fotoUrl,
      );
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

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Menghapus kategori sampah (Admin)',
    description:
      'Menghapus data kategori sampah dari sistem (jika belum terkait dengan riwayat transaksi).',
  })
  @ApiResponse({
    status: 200,
    description: 'Kategori sampah berhasil dihapus',
  })
  @ApiResponse({
    status: 404,
    description: 'Data kategori sampah tidak ditemukan',
  })
  @ResponseMessage('Kategori sampah berhasil dihapus')
  async remove(
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
  ) {
    return this.kategoriSampahService.remove(appMakerId, id);
  }
}
