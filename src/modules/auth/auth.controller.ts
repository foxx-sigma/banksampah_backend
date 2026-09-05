import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
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
import { AuthService } from './auth.service.js';
import {
  RegisterNasabahBankDto,
  RegisterAdminBankDto,
  LoginUserDto,
} from './dto/index.js';
import {
  Public,
  ResponseMessage,
  CurrentAppMaker,
  CurrentUser,
  StorageService,
} from '../../common/index.js';

const nasabahUploadDir = join(process.cwd(), 'uploads', 'nasabah');
if (!existsSync(nasabahUploadDir)) {
  mkdirSync(nasabahUploadDir, { recursive: true });
}

const ALLOWED_MIME_EXT_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
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

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly storageService: StorageService,
  ) {}

  @Public()
  @Post('nasabah/register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('foto', multerNasabahOptions))
  @ResponseMessage('Registrasi nasabah berhasil')
  async registerNasabah(
    @CurrentAppMaker('id') appMakerId: string,
    @Body() dto: RegisterNasabahBankDto,
    @UploadedFile() file?: any,
  ) {
    let fotoUrl: string | undefined;
    if (file) {
      fotoUrl = await this.storageService.uploadFile('nasabah', file);
    }
    try {
      return await this.authService.registerNasabah(appMakerId, dto, fotoUrl);
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
  @Post('admin/register')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Registrasi admin berhasil')
  async registerAdmin(
    @CurrentAppMaker('id') appMakerId: string,
    @Body() dto: RegisterAdminBankDto,
  ) {
    return this.authService.registerAdmin(appMakerId, dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Login berhasil')
  async login(
    @CurrentAppMaker('id') appMakerId: string,
    @Body() dto: LoginUserDto,
  ) {
    return this.authService.login(appMakerId, dto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Profil pengguna berhasil dimuat')
  async getMe(
    @CurrentAppMaker('id') appMakerId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user?.userId || user?.sub;
    return this.authService.getMe(appMakerId, userId);
  }
}
