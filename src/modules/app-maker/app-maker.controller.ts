import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { AppMakerService } from './app-maker.service.js';
import {
  RegisterAppMakerDto,
  LoginAppMakerDto,
  CheckKeyDto,
} from './dto/index.js';
import {
  Public,
  SkipAppKey,
  ResponseMessage,
  CurrentAppMaker,
  AppKeyGuard,
} from '../../common/index.js';

@ApiTags('App Maker')
@Controller('api/v1/maker')
export class AppMakerController {
  constructor(private readonly appMakerService: AppMakerService) {}

  @Public()
  @SkipAppKey()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrasi App Maker baru',
    description:
      'Mendaftarkan akun pembuat aplikasi / tenant baru dan menghasilkan App Key unik untuk Bank Sampah.',
  })
  @ApiResponse({
    status: 201,
    description: 'Registrasi App Maker berhasil',
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi input gagal',
  })
  @ApiResponse({
    status: 409,
    description: 'Email sudah terdaftar',
  })
  @ResponseMessage('Registrasi App Maker berhasil')
  async register(@Body() dto: RegisterAppMakerDto) {
    return this.appMakerService.register(dto);
  }

  @Public()
  @SkipAppKey()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login App Maker',
    description:
      'Otentikasi pembuat aplikasi, menghasilkan JWT token dan mengembalikan App Key tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login App Maker berhasil',
  })
  @ApiResponse({
    status: 401,
    description: 'Email atau password salah',
  })
  @ResponseMessage('Login App Maker berhasil')
  async login(@Body() dto: LoginAppMakerDto) {
    return this.appMakerService.login(dto);
  }

  @Public()
  @UseGuards(AppKeyGuard)
  @Get('profile')
  @ApiOperation({
    summary: 'Mendapatkan profil dan ringkasan tenant App Maker',
    description:
      'Melihat profil tenant dan statistik ringkas data bank sampah berdasarkan header x-app-key.',
  })
  @ApiHeader({
    name: 'x-app-key',
    description: 'Tenant App Key yang valid',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Profil App Maker berhasil dimuat',
  })
  @ApiResponse({
    status: 401,
    description: 'Header x-app-key diperlukan atau tidak valid',
  })
  @ApiResponse({
    status: 404,
    description: 'App Maker tidak ditemukan',
  })
  @ResponseMessage('Profil App Maker berhasil dimuat')
  async getProfile(@CurrentAppMaker() appMaker: { id: string }) {
    return this.appMakerService.getProfile(appMaker.id);
  }

  @Public()
  @SkipAppKey()
  @Get('check-key')
  @ApiOperation({
    summary: 'Mencari App Key berdasarkan Email (Pengembangan)',
    description:
      'Memeriksa dan menampilkan App Key berdasarkan email pendaftar (hanya aktif pada lingkungan non-produksi).',
  })
  @ApiResponse({
    status: 200,
    description: 'App Key berhasil ditemukan',
  })
  @ApiResponse({
    status: 403,
    description: 'Dinonaktifkan pada lingkungan produksi demi keamanan',
  })
  @ApiResponse({
    status: 404,
    description: 'App Maker dengan email tersebut tidak ditemukan',
  })
  @ResponseMessage('App Key berhasil ditemukan')
  async checkKey(@Query() query: CheckKeyDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Endpoint pencarian App Key publik dinonaktifkan pada lingkungan produksi demi keamanan data. Silakan gunakan endpoint login untuk memperoleh App Key.',
      );
    }
    return this.appMakerService.checkKey(query.email);
  }
}
