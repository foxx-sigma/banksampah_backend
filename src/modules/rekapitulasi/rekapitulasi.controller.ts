import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RekapitulasiService } from './rekapitulasi.service.js';
import { RekapitulasiQueryDto } from './dto/index.js';
import {
  Roles,
  ResponseMessage,
} from '../../common/index.js';

@ApiTags('Rekapitulasi')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/rekapitulasi')
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
  async getRekapitulasiBulanan(@Query() query: RekapitulasiQueryDto) {
    return this.rekapitulasiService.getRekapitulasiBulanan(query);
  }
}
