import { IsEnum, IsOptional, Matches } from 'class-validator';
import { StatusPenukaran } from '@prisma/client';

export class QueryPenukaranPoinDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Format bulan harus berupa YYYY-MM (contoh: 2026-09)',
  })
  bulan?: string;

  @IsOptional()
  @IsEnum(StatusPenukaran, {
    message: 'status harus salah satu dari: diproses, selesai',
  })
  status?: StatusPenukaran;
}
