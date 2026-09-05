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

@ApiTags('Auth')
@ApiHeader({
  name: 'x-app-key',
  description: 'Tenant App Key yang valid',
  required: true,
})
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
  @ApiOperation({
    summary: 'Registrasi nasabah baru',
    description:
      'Mendaftarkan akun nasabah baru pada tenant bank sampah dengan opsional upload foto profil.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Registrasi nasabah berhasil',
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi gagal atau format foto tidak didukung',
  })
  @ApiResponse({
    status: 409,
    description: 'Username sudah terdaftar pada bank sampah ini',
  })
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
  @ApiOperation({
    summary: 'Registrasi admin bank sampah',
    description:
      'Mendaftarkan akun administrator untuk unit bank sampah (hanya satu admin unit per tenant).',
  })
  @ApiResponse({
    status: 201,
    description: 'Registrasi admin berhasil',
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
  })
  @ApiResponse({
    status: 409,
    description: 'Admin unit atau username sudah terdaftar',
  })
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
  @ApiOperation({
    summary: 'Login pengguna (Nasabah atau Admin)',
    description:
      'Otentikasi kredensial pengguna bank sampah dan mengembalikan JWT access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login berhasil, token JWT dikembalikan',
  })
  @ApiResponse({
    status: 401,
    description: 'Username atau password salah',
  })
  @ResponseMessage('Login berhasil')
  async login(
    @CurrentAppMaker('id') appMakerId: string,
    @Body() dto: LoginUserDto,
  ) {
    return this.authService.login(appMakerId, dto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mendapatkan profil pengguna yang sedang login',
    description:
      'Mengembalikan informasi profil user (nasabah atau admin) beserta relasi data profilnya.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil pengguna berhasil dimuat',
  })
  @ApiResponse({
    status: 401,
    description: 'Token otentikasi tidak valid atau kedaluwarsa',
  })
  @ApiResponse({
    status: 404,
    description: 'Pengguna tidak ditemukan',
  })
  @ResponseMessage('Profil pengguna berhasil dimuat')
  async getMe(
    @CurrentAppMaker('id') appMakerId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user?.userId || user?.sub;
    return this.authService.getMe(appMakerId, userId);
  }
}
