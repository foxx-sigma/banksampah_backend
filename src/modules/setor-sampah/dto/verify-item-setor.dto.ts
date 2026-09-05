import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyItemSetorDto {
  @ApiProperty({
    description: 'ID UUID Kategori Sampah yang diverifikasi',
    example: 'd9b73489-c454-4866-b31c-90141f173b22',
  })
  @IsString({ message: 'kategoriSampahId harus berupa string UUID' })
  @IsNotEmpty({ message: 'kategoriSampahId tidak boleh kosong' })
  kategoriSampahId: string;

  @ApiProperty({
    description: 'Berat aktual hasil penimbangan admin dalam kg',
    example: 3.2,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'beratKgReal harus berupa angka' })
  @Min(0, { message: 'beratKgReal minimal 0' })
  beratKgReal: number;
}
