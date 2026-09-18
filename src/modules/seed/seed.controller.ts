import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SeedService } from './seed.service.js';
import {
  Roles,
  Public,
  ResponseMessage,
} from '../../common/index.js';

@ApiTags('Seed')
@Controller('api/v1/seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate data seed awal (Pengembangan)',
    description:
      'Menginisialisasi akun admin bank, 2 nasabah, 4 kategori sampah, 3 hadiah, serta contoh transaksi setor dan penukaran awal untuk kemudahan pengujian (dinonaktifkan pada lingkungan produksi).',
  })
  @ApiResponse({
    status: 201,
    description:
      'Data seed berhasil di-generate beserta informasi kredensial akun dummy untuk testing',
  })
  @ApiResponse({
    status: 403,
    description: 'Dinonaktifkan pada lingkungan produksi demi keamanan data',
  })
  @ResponseMessage('Data seed berhasil di-generate')
  async seed() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Endpoint seeding dinonaktifkan pada lingkungan produksi demi keamanan data',
      );
    }
    return this.seedService.seedData();
  }
}
