import { Module } from '@nestjs/common';
import { RekapitulasiController } from './rekapitulasi.controller.js';
import { RekapitulasiService } from './rekapitulasi.service.js';
import { PrismaService } from '../../common/index.js';

@Module({
  controllers: [RekapitulasiController],
  providers: [RekapitulasiService, PrismaService],
  exports: [RekapitulasiService],
})
export class RekapitulasiModule {}
