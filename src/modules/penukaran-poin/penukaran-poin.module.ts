import { Module } from '@nestjs/common';
import { PenukaranPoinController } from './penukaran-poin.controller.js';
import { PenukaranPoinService } from './penukaran-poin.service.js';
import { PrismaService } from '../../common/index.js';

@Module({
  controllers: [PenukaranPoinController],
  providers: [PenukaranPoinService, PrismaService],
  exports: [PenukaranPoinService],
})
export class PenukaranPoinModule {}
