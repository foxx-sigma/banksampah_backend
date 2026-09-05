import { Module } from '@nestjs/common';
import { SeedController } from './seed.controller.js';
import { SeedService } from './seed.service.js';
import { PrismaService } from '../../common/index.js';

@Module({
  controllers: [SeedController],
  providers: [SeedService, PrismaService],
  exports: [SeedService],
})
export class SeedModule {}
