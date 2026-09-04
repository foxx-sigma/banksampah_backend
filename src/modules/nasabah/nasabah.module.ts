import { Module } from '@nestjs/common';
import { NasabahController } from './nasabah.controller.js';
import { NasabahService } from './nasabah.service.js';
import { PrismaService, StorageService } from '../../common/index.js';

@Module({
  controllers: [NasabahController],
  providers: [NasabahService, PrismaService, StorageService],
  exports: [NasabahService],
})
export class NasabahModule {}
