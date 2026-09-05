import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHadiahDto {
  @ApiProperty({
    description: 'Nama item hadiah katalog reward',
    example: 'Tumbler Stainless Eco 500ml',
  })
  @IsString({ message: 'Nama hadiah harus berupa string' })
  @IsNotEmpty({ message: 'Nama hadiah tidak boleh kosong' })
  namaHadiah: string;

  @ApiPropertyOptional({
    description: 'Deskripsi dan spesifikasi hadiah',
    example: 'Tumbler ramah lingkungan berbahan stainless steel tahan panas/dingin',
  })
  @IsOptional()
  @IsString({ message: 'Deskripsi harus berupa string' })
  deskripsi?: string;

  @ApiProperty({
    description: 'Jumlah saldo poin yang dibutuhkan untuk menukar',
    example: 500,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt({ message: 'Poin dibutuhkan harus berupa angka bulat' })
  @Min(0, { message: 'Poin dibutuhkan minimal 0' })
  poinDibutuhkan: number;

  @ApiProperty({
    description: 'Jumlah kuota persediaan stok hadiah yang tersedia',
    example: 20,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt({ message: 'Stok harus berupa angka bulat' })
  @Min(0, { message: 'Stok minimal 0' })
  stok: number;

  @ApiPropertyOptional({
    description: 'File foto produk hadiah (JPG, PNG, atau WEBP, maks 5MB)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  foto?: any;
}
