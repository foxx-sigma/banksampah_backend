import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JenisSampah } from '@prisma/client';
import { SanitizeText } from '../../../common/decorators/sanitize.decorator.js';

export class CreateKategoriSampahDto {
  @ApiProperty({
    description: 'Nama jenis kategori sampah',
    example: 'Botol Plastik PET',
  })
  @SanitizeText()
  @IsString({ message: 'Nama kategori harus berupa string' })
  @IsNotEmpty({ message: 'Nama kategori tidak boleh kosong' })
  namaKategori: string;

  @ApiProperty({
    description: 'Nilai rupiah per kilogram',
    example: 4000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt({ message: 'Harga per kg harus berupa angka bulat' })
  @Min(0, { message: 'Harga per kg minimal 0' })
  hargaPerKg: number;

  @ApiProperty({
    description: 'Nilai perolehan poin per kilogram',
    example: 200,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt({ message: 'Poin per kg harus berupa angka bulat' })
  @Min(0, { message: 'Poin per kg minimal 0' })
  poinPerKg: number;

  @ApiProperty({
    description: 'Kelompok jenis sampah',
    enum: JenisSampah,
    example: 'plastik',
  })
  @IsEnum(JenisSampah, {
    message: 'Jenis sampah harus salah satu dari: plastik, kertas, logam, kaca',
  })
  jenis: JenisSampah;

  @ApiPropertyOptional({
    description: 'Foto ikon/gambar kategori sampah (JPG, PNG, WEBP maks 5MB)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  foto?: any;
}
