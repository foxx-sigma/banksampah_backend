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
  AppKeyGuard,
  JwtAuthGuard,
  RolesGuard,
  ResponseMessage,
  CurrentAppMaker,
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

@Controller('api/v1/hadiah')
export class HadiahController {
  constructor(
    private readonly hadiahService: HadiahService,
    private readonly storageService: StorageService,
  ) {}

  @Public()
  @UseGuards(AppKeyGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Daftar katalog hadiah berhasil dimuat')
  async findAll(@CurrentAppMaker('id') appMakerId: string) {
    return this.hadiahService.findAll(appMakerId);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('foto', multerHadiahOptions))
  @ResponseMessage('Hadiah berhasil ditambahkan')
  async create(
    @CurrentAppMaker('id') appMakerId: string,
    @Body() dto: CreateHadiahDto,
    @UploadedFile() file?: any,
  ) {
    let fotoUrl: string | undefined;
    if (file) {
      fotoUrl = await this.storageService.uploadFile('hadiah', file);
    }

    try {
      return await this.hadiahService.create(appMakerId, dto, fotoUrl);
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
  @ResponseMessage('Detail hadiah berhasil dimuat')
  async findOne(
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
  ) {
    return this.hadiahService.findOne(appMakerId, id);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('foto', multerHadiahOptions))
  @ResponseMessage('Hadiah berhasil diperbarui')
  async update(
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHadiahDto,
    @UploadedFile() file?: any,
  ) {
    let fotoUrl: string | undefined;
    if (file) {
      fotoUrl = await this.storageService.uploadFile('hadiah', file);
    }

    try {
      return await this.hadiahService.update(appMakerId, id, dto, fotoUrl);
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
  @ResponseMessage('Hadiah berhasil dihapus')
  async remove(
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
  ) {
    return this.hadiahService.remove(appMakerId, id);
  }
}
