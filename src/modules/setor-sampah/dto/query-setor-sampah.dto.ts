import { IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusSetor } from '@prisma/client';

export class QuerySetorSampahDto {
  @ApiPropertyOptional({
    description: 'Filter berdasarkan bulan transaksi (format YYYY-MM)',
    example: '2026-09',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Format bulan harus berupa YYYY-MM (contoh: 2026-09)',
  })
  bulan?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status verifikasi transaksi',
    enum: StatusSetor,
    example: 'menunggu_konfirmasi',
  })
  @IsOptional()
  @IsEnum(StatusSetor, {
    message:
      'status harus salah satu dari: menunggu_konfirmasi, diverifikasi, ditolak, selesai',
  })
  status?: StatusSetor;
}
