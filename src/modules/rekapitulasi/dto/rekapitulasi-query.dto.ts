import { IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RekapitulasiQueryDto {
  @ApiProperty({
    description: 'Periode bulan rekapitulasi data (format YYYY-MM)',
    example: '2026-09',
  })
  @IsNotEmpty({ message: 'Parameter bulan wajib diisi' })
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Format bulan harus berupa YYYY-MM (contoh: 2026-09)',
  })
  bulan: string;
}
