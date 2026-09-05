import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SeedService } from './seed.service.js';
import {
  AppKeyGuard,
  Public,
  ResponseMessage,
  CurrentAppMaker,
} from '../../common/index.js';

@Controller('api/v1/seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Public()
  @UseGuards(AppKeyGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Data seed berhasil di-generate')
  async seed(@CurrentAppMaker('id') appMakerId: string) {
    return this.seedService.seedTenantData(appMakerId);
  }
}
