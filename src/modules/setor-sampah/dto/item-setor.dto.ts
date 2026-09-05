import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ItemSetorDto {
  @ApiProperty({
    description: 'ID UUID Kategori Sampah',
    example: 'd9b73489-c454-4866-b31c-90141f173b22',
  })
  @IsString({ message: 'kategoriSampahId harus berupa string UUID' })
  @IsNotEmpty({ message: 'kategoriSampahId tidak boleh kosong' })
  kategoriSampahId: string;

  @ApiProperty({
    description: 'Estimasi berat sampah yang disetor dalam kilogram (kg)',
    example: 3.5,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'beratKg harus berupa angka' })
  @Min(0.01, { message: 'beratKg minimal 0.01 kg' })
  beratKg: number;
}
