import { Module } from '@nestjs/common';
import { AppMakerController } from './app-maker.controller.js';
import { AppMakerService } from './app-maker.service.js';
import { PrismaService } from '../../common/prisma.service.js';

@Module({
  controllers: [AppMakerController],
  providers: [AppMakerService, PrismaService],
  exports: [AppMakerService],
})
export class AppMakerModule {}
