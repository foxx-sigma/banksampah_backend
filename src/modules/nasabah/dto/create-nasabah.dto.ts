import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNasabahDto {
  @ApiProperty({
    description: 'Username unik nasabah',
    example: 'nasabah_budi',
  })
  @IsString({ message: 'Username harus berupa string' })
  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  username: string;

  @ApiProperty({
    description: 'Password nasabah minimal 6 karakter',
    example: 'password123',
    minLength: 6,
  })
  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @ApiProperty({
    description: 'Nama nasabah',
    example: 'Budi Santoso',
  })
  @IsString({ message: 'Nama nasabah harus berupa string' })
  @IsNotEmpty({ message: 'Nama nasabah tidak boleh kosong' })
  namaNasabah: string;

  @ApiProperty({
    description: 'Alamat tempat tinggal nasabah',
    example: 'Jl. Merdeka No. 10',
  })
  @IsString({ message: 'Alamat harus berupa string' })
  @IsNotEmpty({ message: 'Alamat tidak boleh kosong' })
  alamat: string;

  @ApiProperty({
    description: 'Nomor telepon nasabah',
    example: '081298765432',
  })
  @IsString({ message: 'Nomor telepon harus berupa string' })
  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  telp: string;

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

  @ApiPropertyOptional({
    description: 'Alias nama lengkap nasabah',
    example: 'Budi Santoso',
  })
  @IsOptional()
  @IsString()
  namaLengkap?: string;

  @ApiPropertyOptional({
    description: 'Alias nomor telepon nasabah',
    example: '081298765432',
  })
  @IsOptional()
  @IsString()
  noTelepon?: string;
}
