import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeText } from '../../../common/decorators/sanitize.decorator.js';

export class UpdateHadiahDto {
  @ApiPropertyOptional({
    description: 'Nama hadiah reward',
    example: 'Tumbler Stainless Eco 500ml',
  })
  @IsOptional()
  @SanitizeText()
  @IsString({ message: 'Nama hadiah harus berupa string' })
  @IsNotEmpty({ message: 'Nama hadiah tidak boleh kosong' })
  namaHadiah?: string;

  @ApiPropertyOptional({
    description: 'Deskripsi penjelasan hadiah',
    example: 'Tumbler ramah lingkungan edisi terbaru',
  })
  @IsOptional()
  @SanitizeText()
  @IsString({ message: 'Deskripsi harus berupa string' })
  deskripsi?: string;

  @ApiPropertyOptional({
    description: 'Jumlah poin yang dibutuhkan',
    example: 450,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Poin dibutuhkan harus berupa angka bulat' })
  @Min(0, { message: 'Poin dibutuhkan minimal 0' })
  poinDibutuhkan?: number;

  @ApiPropertyOptional({
    description: 'Jumlah sisa persediaan stok',
    example: 25,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Stok harus berupa angka bulat' })
  @Min(0, { message: 'Stok minimal 0' })
  stok?: number;

  @ApiPropertyOptional({
    description: 'File foto hadiah (JPG, PNG, atau WEBP, maks 5MB)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  foto?: any;
}
