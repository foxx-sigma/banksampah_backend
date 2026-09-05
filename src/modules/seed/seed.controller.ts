import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { SeedService } from './seed.service.js';
import {
  AppKeyGuard,
  Public,
  ResponseMessage,
  CurrentAppMaker,
} from '../../common/index.js';

@ApiTags('Seed')
@ApiHeader({
  name: 'x-app-key',
  description: 'Tenant App Key yang valid',
  required: true,
})
@Controller('api/v1/seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Public()
  @UseGuards(AppKeyGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate data seed awal tenant (Pengembangan)',
    description:
      'Menginisialisasi akun admin bank, 2 nasabah, 4 kategori sampah, 3 hadiah, serta contoh transaksi setor dan penukaran awal untuk kemudahan pengujian (dinonaktifkan pada lingkungan produksi).',
  })
  @ApiResponse({
    status: 201,
    description:
      'Data seed berhasil di-generate beserta informasi kredensial akun dummy untuk testing',
  })
  @ApiResponse({
    status: 401,
    description: 'Header x-app-key diperlukan atau tidak valid',
  })
  @ApiResponse({
    status: 403,
    description: 'Dinonaktifkan pada lingkungan produksi demi keamanan data',
  })
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
