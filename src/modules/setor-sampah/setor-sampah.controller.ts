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

@Controller('api/v1/setor-sampah')
export class SetorSampahController {
  constructor(private readonly setorSampahService: SetorSampahService) {}

  @UseGuards(AppKeyGuard, JwtAuthGuard, RolesGuard)
  @Roles('NASABAH')
  @Post('pengajuan')
  @HttpCode(HttpStatus.CREATED)
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
  @ResponseMessage('Detail transaksi setor sampah berhasil dimuat')
  async findOne(
    @CurrentAppMaker('id') appMakerId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.setorSampahService.findOne(appMakerId, id, user);
  }
}
