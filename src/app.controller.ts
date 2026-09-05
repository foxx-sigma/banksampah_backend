import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public, SkipAppKey } from './common/index.js';

@ApiTags('Root / Health')
@Public()
@SkipAppKey()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Pemeriksaan status server (Health check)',
    description: 'Endpoint pengujian status aktif server backend.',
  })
  @ApiResponse({
    status: 200,
    description: 'Server aktif dan merespons',
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
