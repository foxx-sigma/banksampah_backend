import { Module } from '@nestjs/common';
import { SetorSampahController } from './setor-sampah.controller.js';
import { SetorSampahService } from './setor-sampah.service.js';
import { PrismaService } from '../../common/index.js';

@Module({
  controllers: [SetorSampahController],
  providers: [SetorSampahService, PrismaService],
  exports: [SetorSampahService],
})
export class SetorSampahModule {}
