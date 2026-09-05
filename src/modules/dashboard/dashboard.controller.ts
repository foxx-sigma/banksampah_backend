import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import {
  AppKeyGuard,
  JwtAuthGuard,
  RolesGuard,
  Roles,
  Public,
  ResponseMessage,
  CurrentAppMaker,
  CurrentUser,
} from '../../common/index.js';

@ApiTags('Dashboard')
@ApiHeader({
  name: 'x-app-key',
  description: 'Tenant App Key yang valid',
  required: true,
})
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('NASABAH')
  @Get('summary')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Ringkasan dasbor nasabah (Nasabah)',
    description:
      'Menampilkan saldo poin saat ini, total berat sampah disetor, total poin didapat, total poin ditukar, serta transaksi terakhir setor dan tukar poin nasabah.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ringkasan dashboard nasabah berhasil diambil',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token atau App Key tidak valid',
  })
  @ApiResponse({
    status: 404,
    description: 'Data profil nasabah tidak ditemukan',
  })
  @ResponseMessage('Ringkasan dashboard nasabah berhasil diambil')
  async getSummary(
    @CurrentAppMaker('id') appMakerId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user?.userId || user?.id || user?.sub;
    return this.dashboardService.getSummary(appMakerId, userId);
  }

  @Public()
  @UseGuards(AppKeyGuard)
  @Get('stats')
  @ApiOperation({
    summary: 'Statistik agregat bank sampah',
    description:
      'Menampilkan data statistik agregat bank sampah (total nasabah, total kategori sampah, transaksi setor, total hadiah, total berat sampah, dan total poin tersalurkan).',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistik dashboard berhasil diambil',
  })
  @ApiResponse({
    status: 401,
    description: 'Header x-app-key diperlukan atau tidak valid',
  })
  @ResponseMessage('Statistik dashboard berhasil diambil')
  async getStats(@CurrentAppMaker('id') appMakerId: string) {
    return this.dashboardService.getStats(appMakerId);
  }
}
