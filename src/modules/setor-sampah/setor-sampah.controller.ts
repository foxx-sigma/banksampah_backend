import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
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
import { SetorSampahService } from './setor-sampah.service.js';
import {
  CreateSetorSampahDto,
  VerifySetorSampahDto,
  QuerySetorSampahDto,
} from './dto/index.js';
import {
  Roles,
  ResponseMessage,
  CurrentUser,
  StorageService,
} from '../../common/index.js';

const setorUploadDir = join(process.cwd(), 'uploads', 'setor-sampah');
if (!existsSync(setorUploadDir)) {
  mkdirSync(setorUploadDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const multerSetorStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(setorUploadDir)) {
      mkdirSync(setorUploadDir, { recursive: true });
    }
    cb(null, setorUploadDir);
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

const multerSetorOptions = {
  storage: multerSetorStorage,
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

@ApiTags('Setor Sampah')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/setor-sampah')
export class SetorSampahController {
  constructor(
    private readonly setorSampahService: SetorSampahService,
    private readonly storageService: StorageService,
  ) {}

  @Roles('NASABAH')
  @Post('pengajuan')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('foto', multerSetorOptions))
  @ApiOperation({
    summary: 'Pengajuan setor sampah oleh Nasabah',
    description:
      'Nasabah mengajukan transaksi setor sampah dengan daftar item sampah yang akan disetorkan.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Pengajuan setor sampah berhasil dibuat',
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input atau kategori sampah tidak valid',
  })
  @ResponseMessage('Pengajuan setor sampah berhasil dibuat')
  async createPengajuan(
    @CurrentUser() user: any,
    @Body() dto: CreateSetorSampahDto,
    @UploadedFile() file?: any,
  ) {
    const userId = user?.userId || user?.id || user?.sub;

    let fotoUrl: string | undefined;
    if (file) {
      fotoUrl = await this.storageService.uploadFile('setor-sampah', file);
    }

    try {
      return await this.setorSampahService.createPengajuan(userId, dto, fotoUrl);
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

  @Roles('NASABAH')
  @Get('my-setor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Riwayat setor sampah nasabah (Nasabah)',
    description:
      'Nasabah melihat riwayat penyetoran sampah miliknya sendiri, dengan filter opsional bulan dan status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Histori setor sampah berhasil dimuat',
  })
  @ResponseMessage('Histori setor sampah berhasil dimuat')
  async findMySetor(
    @CurrentUser() user: any,
    @Query() query: QuerySetorSampahDto,
  ) {
    const userId = user?.userId || user?.id || user?.sub;
    return this.setorSampahService.findMySetor(userId, query);
  }

  @Roles('ADMIN')
  @Get('admin/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Daftar transaksi setor sampah seluruh nasabah (Admin)',
    description:
      'Admin melihat seluruh transaksi penyetoran sampah nasabah pada unit bank sampah ini.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar pengajuan setor sampah berhasil dimuat',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Hanya Admin yang berhak mengakses',
  })
  @ResponseMessage('Daftar pengajuan setor sampah berhasil dimuat')
  async findAllAdmin(@Query() query: QuerySetorSampahDto) {
    return this.setorSampahService.findAllAdmin(query);
  }

  @Roles('ADMIN')
  @Put('admin/verify/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verifikasi hasil setor sampah (Admin)',
    description:
      'Admin memverifikasi status setoran sampah (selesai/diverifikasi/ditolak) dan mencatat berat aktual hasil timbangan serta otomatis mengkalkulasi perolehan poin nasabah.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verifikasi setor sampah berhasil diproses',
  })
  @ApiResponse({
    status: 400,
    description: 'Transaksi tidak valid atau sudah selesai/ditolak',
  })
  @ApiResponse({
    status: 404,
    description: 'Data setor sampah tidak ditemukan',
  })
  @ResponseMessage('Verifikasi setor sampah berhasil diproses')
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifySetorSampahDto,
    @CurrentUser() user: any,
  ) {
    const adminUserId = user?.userId || user?.id || user?.sub;
    return this.setorSampahService.verify(id, dto, adminUserId);
  }

  @Roles('NASABAH', 'ADMIN')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detail transaksi setor sampah',
    description:
      'Melihat rincian transaksi setor sampah berdasarkan ID transaksi (dapat diakses oleh nasabah pemilik atau admin).',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail transaksi setor sampah berhasil dimuat',
  })
  @ApiResponse({
    status: 404,
    description: 'Data setor sampah tidak ditemukan',
  })
  @ResponseMessage('Detail transaksi setor sampah berhasil dimuat')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.setorSampahService.findOne(id, user);
  }
}
