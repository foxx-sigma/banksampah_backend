import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public, SkipAppKey } from './common/index.js';

@Public()
@SkipAppKey()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
