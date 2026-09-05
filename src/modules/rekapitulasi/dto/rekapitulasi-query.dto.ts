import { IsNotEmpty, Matches } from 'class-validator';

export class RekapitulasiQueryDto {
  @IsNotEmpty({ message: 'Parameter bulan wajib diisi' })
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Format bulan harus berupa YYYY-MM (contoh: 2026-09)',
  })
  bulan: string;
}
