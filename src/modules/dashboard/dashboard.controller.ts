import { Controller, Get, UseGuards } from '@nestjs/common';
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

@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('NASABAH')
  @Get('summary')
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
  @ResponseMessage('Statistik dashboard berhasil diambil')
  async getStats(@CurrentAppMaker('id') appMakerId: string) {
    return this.dashboardService.getStats(appMakerId);
  }
}
