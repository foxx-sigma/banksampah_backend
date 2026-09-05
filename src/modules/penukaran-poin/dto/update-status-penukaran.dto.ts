import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusPenukaran } from '@prisma/client';

export class UpdateStatusPenukaranDto {
  @IsEnum(StatusPenukaran, {
    message: 'status harus salah satu dari: diproses, selesai',
  })
  status: StatusPenukaran;

  @IsOptional()
  @IsString({ message: 'catatan harus berupa string' })
  catatan?: string;
}
