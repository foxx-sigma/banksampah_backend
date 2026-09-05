import { IsEnum, IsOptional, Matches } from 'class-validator';
import { StatusSetor } from '@prisma/client';

export class QuerySetorSampahDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Format bulan harus berupa YYYY-MM (contoh: 2026-09)',
  })
  bulan?: string;

  @IsOptional()
  @IsEnum(StatusSetor, {
    message:
      'status harus salah satu dari: menunggu_konfirmasi, diverifikasi, ditolak, selesai',
  })
  status?: StatusSetor;
}
