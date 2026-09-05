import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JenisSampah } from '@prisma/client';

export class UpdateKategoriSampahDto {
  @ApiPropertyOptional({
    description: 'Nama kategori sampah',
    example: 'Botol Plastik PET Bersih',
  })
  @IsOptional()
  @IsString({ message: 'Nama kategori harus berupa string' })
  @IsNotEmpty({ message: 'Nama kategori tidak boleh kosong' })
  namaKategori?: string;

  @ApiPropertyOptional({
    description: 'Harga per kg dalam rupiah',
    example: 4500,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Harga per kg harus berupa angka bulat' })
  @Min(0, { message: 'Harga per kg minimal 0' })
  hargaPerKg?: number;

  @ApiPropertyOptional({
    description: 'Poin reward per kg',
    example: 220,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Poin per kg harus berupa angka bulat' })
  @Min(0, { message: 'Poin per kg minimal 0' })
  poinPerKg?: number;

  @ApiPropertyOptional({
    description: 'Jenis kategori sampah',
    enum: JenisSampah,
    example: 'plastik',
  })
  @IsOptional()
  @IsEnum(JenisSampah, {
    message: 'Jenis sampah harus salah satu dari: plastik, kertas, logam, kaca',
  })
  jenis?: JenisSampah;

  @ApiPropertyOptional({
    description: 'File gambar kategori sampah (JPG, PNG, WEBP maks 5MB)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  foto?: any;
}
