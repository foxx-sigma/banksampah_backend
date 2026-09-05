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

@Controller('api/v1/penukaran-poin')
export class PenukaranPoinController {
  constructor(private readonly penukaranPoinService: PenukaranPoinService) {}

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('NASABAH')
  @Post('tukar')
  @HttpCode(HttpStatus.CREATED)
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
  @ResponseMessage('Nota transaksi penukaran poin berhasil dimuat')
  async getNota(
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.penukaranPoinService.getNota(appMakerId, id, user);
  }
}
