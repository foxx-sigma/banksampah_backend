import { IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusPenukaran } from '@prisma/client';

export class QueryPenukaranPoinDto {
  @ApiPropertyOptional({
    description: 'Filter berdasarkan bulan pengajuan penukaran (format YYYY-MM)',
    example: '2026-09',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Format bulan harus berupa YYYY-MM (contoh: 2026-09)',
  })
  bulan?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status proses penukaran',
    enum: StatusPenukaran,
    example: 'diproses',
  })
  @IsOptional()
  @IsEnum(StatusPenukaran, {
    message: 'status harus salah satu dari: diproses, selesai',
  })
  status?: StatusPenukaran;
}
