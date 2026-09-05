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
import { PenukaranPoinService } from './penukaran-poin.service.js';
import {
  CreatePenukaranPoinDto,
  UpdateStatusPenukaranDto,
  QueryPenukaranPoinDto,
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

@ApiTags('Penukaran Poin')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'x-app-key',
  description: 'Tenant App Key yang valid',
  required: true,
})
@Controller('api/v1/penukaran-poin')
export class PenukaranPoinController {
  constructor(private readonly penukaranPoinService: PenukaranPoinService) {}

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('NASABAH')
  @Post('tukar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Pengajuan penukaran poin (Nasabah)',
    description:
      'Nasabah menukarkan sejumlah saldo poin dengan item hadiah reward yang dipilih.',
  })
  @ApiResponse({
    status: 201,
    description: 'Penukaran poin berhasil diajukan',
  })
  @ApiResponse({
    status: 400,
    description: 'Saldo poin atau stok hadiah tidak mencukupi',
  })
  @ApiResponse({
    status: 404,
    description: 'Hadiah tidak ditemukan',
  })
  @ResponseMessage('Penukaran poin berhasil diajukan')
  async tukarPoin(
    @CurrentAppMaker('id') appMakerId: string,
    @CurrentUser() user: any,
    @Body() dto: CreatePenukaranPoinDto,
  ) {
    const userId = user?.userId || user?.id || user?.sub;
    return this.penukaranPoinService.tukarPoin(appMakerId, userId, dto);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('NASABAH')
  @Get('my-penukaran')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Riwayat penukaran poin nasabah (Nasabah)',
    description:
      'Melihat riwayat transaksi penukaran poin milik nasabah yang sedang login dengan filter bulan atau status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Histori penukaran poin berhasil dimuat',
  })
  @ResponseMessage('Histori penukaran poin berhasil dimuat')
  async findMyPenukaran(
    @CurrentAppMaker('id') appMakerId: string,
    @CurrentUser() user: any,
    @Query() query: QueryPenukaranPoinDto,
  ) {
    const userId = user?.userId || user?.id || user?.sub;
    return this.penukaranPoinService.findMyPenukaran(appMakerId, userId, query);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Daftar transaksi penukaran poin seluruh nasabah (Admin)',
    description:
      'Admin melihat seluruh permohonan dan transaksi penukaran poin nasabah pada bank sampah ini.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar transaksi penukaran poin berhasil dimuat',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Hanya Admin yang berhak mengakses',
  })
  @ResponseMessage('Daftar transaksi penukaran poin berhasil dimuat')
  async findAllAdmin(
    @CurrentAppMaker('id') appMakerId: string,
    @Query() query: QueryPenukaranPoinDto,
  ) {
    return this.penukaranPoinService.findAllAdmin(appMakerId, query);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('admin/status/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Memperbarui status penukaran poin (Admin)',
    description:
      'Admin mengubah status proses penukaran poin (diproses atau selesai) serta memberikan catatan serah terima.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status penukaran poin berhasil diperbarui',
  })
  @ApiResponse({
    status: 404,
    description: 'Data penukaran poin tidak ditemukan',
  })
  @ResponseMessage('Status penukaran poin berhasil diperbarui')
  async updateStatus(
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusPenukaranDto,
  ) {
    return this.penukaranPoinService.updateStatus(appMakerId, id, dto);
  }

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('NASABAH', 'ADMIN')
  @Get('nota/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nota bukti transaksi penukaran poin',
    description:
      'Mendapatkan data nota transaksi penukaran poin lengkap (dapat diakses oleh nasabah pemilik atau admin).',
  })
  @ApiResponse({
    status: 200,
    description: 'Nota transaksi penukaran poin berhasil dimuat',
  })
  @ApiResponse({
    status: 404,
    description: 'Data penukaran poin tidak ditemukan',
  })
  @ResponseMessage('Nota transaksi penukaran poin berhasil dimuat')
  async getNota(
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.penukaranPoinService.getNota(appMakerId, id, user);
  }
}
