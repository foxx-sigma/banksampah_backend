import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ItemSetorDto {
  @IsString({ message: 'kategoriSampahId harus berupa string UUID' })
  @IsNotEmpty({ message: 'kategoriSampahId tidak boleh kosong' })
  kategoriSampahId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'beratKg harus berupa angka' })
  @Min(0.01, { message: 'beratKg minimal 0.01 kg' })
  beratKg: number;
}
