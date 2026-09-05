import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNasabahDto {
  @ApiPropertyOptional({
    description: 'Nama lengkap nasabah',
    example: 'Budi Santoso',
  })
  @IsOptional()
  @IsString({ message: 'Nama lengkap harus berupa string' })
  namaLengkap?: string;

  @ApiPropertyOptional({
    description: 'Nama nasabah',
    example: 'Budi Santoso',
  })
  @IsOptional()
  @IsString({ message: 'Nama nasabah harus berupa string' })
  namaNasabah?: string;

  @ApiPropertyOptional({
    description: 'Nomor telepon nasabah',
    example: '081298765432',
  })
  @IsOptional()
  @IsString({ message: 'Nomor telepon harus berupa string' })
  noTelepon?: string;

  @ApiPropertyOptional({
    description: 'Nomor telepon nasabah',
    example: '081298765432',
  })
  @IsOptional()
  @IsString({ message: 'Nomor telepon harus berupa string' })
  telp?: string;

  @ApiPropertyOptional({
    description: 'Alamat tempat tinggal nasabah',
    example: 'Jl. Merdeka No. 12',
  })
  @IsOptional()
  @IsString({ message: 'Alamat harus berupa string' })
  alamat?: string;

  @ApiPropertyOptional({
    description: 'Tanggal lahir nasabah format ISO 8601 (YYYY-MM-DD)',
    example: '1995-05-15',
  })
  @IsOptional()
  @IsString({ message: 'Format tanggal lahir harus berupa string tanggal' })
  tanggalLahir?: string;

  @ApiPropertyOptional({
    description: 'File foto profil nasabah (JPG, PNG, atau WEBP, maks 5MB)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  foto?: any;
}
