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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SetorSampahService } from './setor-sampah.service.js';
import {
  CreateSetorSampahDto,
  VerifySetorSampahDto,
  QuerySetorSampahDto,
} from './dto/index.js';
import {
  Roles,
  AppKeyGuard,
  JwtAuthGuard,
  RolesGuard,
  ResponseMessage,
  CurrentAppMaker,
  CurrentUser,
} from '../../common/index.js';

@ApiTags('Setor Sampah')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'x-app-key',
  description: 'Tenant App Key yang valid',
  required: true,
})
@Controller('api/v1/setor-sampah')
export class SetorSampahController {
  constructor(private readonly setorSampahService: SetorSampahService) {}

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('NASABAH')
  @Post('pengajuan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Pengajuan setor sampah oleh Nasabah',
    description:
      'Nasabah mengajukan transaksi setor sampah dengan daftar item sampah yang akan disetorkan.',
  })
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
    @CurrentAppMaker('id') appMakerId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSetorSampahDto,
  ) {
    const userId = user?.userId || user?.id || user?.sub;
    return this.setorSampahService.createPengajuan(appMakerId, userId, dto);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
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
    @CurrentAppMaker('id') appMakerId: string,
    @CurrentUser() user: any,
    @Query() query: QuerySetorSampahDto,
  ) {
    const userId = user?.userId || user?.id || user?.sub;
    return this.setorSampahService.findMySetor(appMakerId, userId, query);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
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
  async findAllAdmin(
    @CurrentAppMaker('id') appMakerId: string,
    @Query() query: QuerySetorSampahDto,
  ) {
    return this.setorSampahService.findAllAdmin(appMakerId, query);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
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
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
    @Body() dto: VerifySetorSampahDto,
  ) {
    return this.setorSampahService.verify(appMakerId, id, dto);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
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
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.setorSampahService.findOne(appMakerId, id, user);
  }
}
