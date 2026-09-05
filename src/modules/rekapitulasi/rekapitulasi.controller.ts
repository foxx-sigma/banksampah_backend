import {
  Controller,
  Get,
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
import { RekapitulasiService } from './rekapitulasi.service.js';
import { RekapitulasiQueryDto } from './dto/index.js';
import {
  Roles,
  AppKeyGuard,
  JwtAuthGuard,
  RolesGuard,
  ResponseMessage,
  CurrentAppMaker,
} from '../../common/index.js';

@ApiTags('Rekapitulasi')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'x-app-key',
  description: 'Tenant App Key yang valid',
  required: true,
})
@Controller('api/v1/rekapitulasi')
@UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RekapitulasiController {
  constructor(private readonly rekapitulasiService: RekapitulasiService) {}

  @Get('bulanan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Laporan rekapitulasi transaksi bulanan (Admin)',
    description:
      'Menampilkan rekapitulasi bulanan mencakup total tonase sampah per jenis (plastik, kertas, logam, kaca), total estimasi rupiah, poin diterbitkan, dan rekapitulasi penukaran hadiah.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rekapitulasi bulanan berhasil dimuat',
  })
  @ApiResponse({
    status: 400,
    description: 'Parameter bulan wajib diisi dengan format YYYY-MM',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Hanya Admin yang berhak mengakses',
  })
  @ResponseMessage('Rekapitulasi bulanan berhasil dimuat')
  async getRekapitulasiBulanan(
    @CurrentAppMaker('id') appMakerId: string,
    @Query() query: RekapitulasiQueryDto,
  ) {
    return this.rekapitulasiService.getRekapitulasiBulanan(appMakerId, query);
  }
}
