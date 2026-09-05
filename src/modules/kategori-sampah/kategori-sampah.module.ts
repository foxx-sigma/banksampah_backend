import { Module } from '@nestjs/common';
import { KategoriSampahController } from './kategori-sampah.controller.js';
import { KategoriSampahService } from './kategori-sampah.service.js';
import { PrismaService, StorageService } from '../../common/index.js';

@Module({
  controllers: [KategoriSampahController],
  providers: [KategoriSampahService, PrismaService, StorageService],
  exports: [KategoriSampahService],
})
export class KategoriSampahModule {}
