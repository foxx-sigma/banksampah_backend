import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyItemSetorDto {
  @IsString({ message: 'kategoriSampahId harus berupa string UUID' })
  @IsNotEmpty({ message: 'kategoriSampahId tidak boleh kosong' })
  kategoriSampahId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'beratKgReal harus berupa angka' })
  @Min(0, { message: 'beratKgReal minimal 0' })
  beratKgReal: number;
}
