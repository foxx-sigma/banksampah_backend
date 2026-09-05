import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHadiahDto {
  @IsOptional()
  @IsString({ message: 'Nama hadiah harus berupa string' })
  @IsNotEmpty({ message: 'Nama hadiah tidak boleh kosong' })
  namaHadiah?: string;

  @IsOptional()
  @IsString({ message: 'Deskripsi harus berupa string' })
  deskripsi?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Poin dibutuhkan harus berupa angka bulat' })
  @Min(0, { message: 'Poin dibutuhkan minimal 0' })
  poinDibutuhkan?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Stok harus berupa angka bulat' })
  @Min(0, { message: 'Stok minimal 0' })
  stok?: number;

  @IsOptional()
  foto?: any;
}
