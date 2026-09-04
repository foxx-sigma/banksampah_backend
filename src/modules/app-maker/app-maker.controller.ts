import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AppMakerService } from './app-maker.service.js';
import {
  RegisterAppMakerDto,
  LoginAppMakerDto,
  CheckKeyDto,
} from './dto/index.js';
import {
  Public,
  SkipAppKey,
  ResponseMessage,
  CurrentAppMaker,
  AppKeyGuard,
} from '../../common/index.js';

@Controller('api/v1/maker')
export class AppMakerController {
  constructor(private readonly appMakerService: AppMakerService) {}

  @Public()
  @SkipAppKey()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Registrasi App Maker berhasil')
  async register(@Body() dto: RegisterAppMakerDto) {
    return this.appMakerService.register(dto);
  }

  @Public()
  @SkipAppKey()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Login App Maker berhasil')
  async login(@Body() dto: LoginAppMakerDto) {
    return this.appMakerService.login(dto);
  }

  @Public()
  @UseGuards(AppKeyGuard)
  @Get('profile')
  @ResponseMessage('Profil App Maker berhasil dimuat')
  async getProfile(@CurrentAppMaker() appMaker: { id: string }) {
    return this.appMakerService.getProfile(appMaker.id);
  }

  @Public()
  @SkipAppKey()
  @Get('check-key')
  @ResponseMessage('App Key berhasil ditemukan')
  async checkKey(@Query() query: CheckKeyDto) {
    return this.appMakerService.checkKey(query.email);
  }
}
