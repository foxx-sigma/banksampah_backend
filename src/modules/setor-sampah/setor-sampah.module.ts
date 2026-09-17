import { Module } from '@nestjs/common';
import { SetorSampahController } from './setor-sampah.controller.js';
import { SetorSampahService } from './setor-sampah.service.js';
import { PrismaService, StorageService } from '../../common/index.js';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [SetorSampahController],
  providers: [SetorSampahService, PrismaService, StorageService, ConfigService],
  exports: [SetorSampahService],
})
export class SetorSampahModule {}
