import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JenisSampah } from '@prisma/client';

export class UpdateKategoriSampahDto {
  @IsOptional()
  @IsString({ message: 'Nama kategori harus berupa string' })
  @IsNotEmpty({ message: 'Nama kategori tidak boleh kosong' })
  namaKategori?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Harga per kg harus berupa angka bulat' })
  @Min(0, { message: 'Harga per kg minimal 0' })
  hargaPerKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Poin per kg harus berupa angka bulat' })
  @Min(0, { message: 'Poin per kg minimal 0' })
  poinPerKg?: number;

  @IsOptional()
  @IsEnum(JenisSampah, {
    message: 'Jenis sampah harus salah satu dari: plastik, kertas, logam, kaca',
  })
  jenis?: JenisSampah;

  @IsOptional()
  foto?: any;
}
