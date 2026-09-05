import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
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
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Endpoint seeding dinonaktifkan pada lingkungan produksi demi keamanan data',
      );
    }
    return this.seedService.seedTenantData(appMakerId);
  }
}
