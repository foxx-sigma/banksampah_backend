import { Module } from '@nestjs/common';
import { HadiahController } from './hadiah.controller.js';
import { HadiahService } from './hadiah.service.js';
import { PrismaService, StorageService } from '../../common/index.js';

@Module({
  controllers: [HadiahController],
  providers: [HadiahService, PrismaService, StorageService],
  exports: [HadiahService],
})
export class HadiahModule {}
