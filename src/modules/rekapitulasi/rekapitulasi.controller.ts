import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
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

@Controller('api/v1/rekapitulasi')
@UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RekapitulasiController {
  constructor(private readonly rekapitulasiService: RekapitulasiService) {}

  @Get('bulanan')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Rekapitulasi bulanan berhasil dimuat')
  async getRekapitulasiBulanan(
    @CurrentAppMaker('id') appMakerId: string,
    @Query() query: RekapitulasiQueryDto,
  ) {
    return this.rekapitulasiService.getRekapitulasiBulanan(appMakerId, query);
  }
}
