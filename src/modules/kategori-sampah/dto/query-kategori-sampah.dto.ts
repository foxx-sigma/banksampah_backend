import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JenisSampah } from '@prisma/client';

export class QueryKategoriSampahDto {
  @ApiPropertyOptional({
    description: 'Keyword pencarian untuk nama kategori sampah',
    example: 'botol',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan jenis sampah',
    enum: JenisSampah,
    example: 'plastik',
  })
  @IsOptional()
  @IsEnum(JenisSampah)
  jenis?: JenisSampah;

  @ApiPropertyOptional({
    description: 'Nomor halaman',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Jumlah data per halaman',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
