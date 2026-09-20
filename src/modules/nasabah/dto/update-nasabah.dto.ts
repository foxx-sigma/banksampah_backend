import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeText } from '../../../common/decorators/sanitize.decorator.js';

export class UpdateNasabahDto {
  @ApiPropertyOptional({
    description: 'Username akun nasabah',
    example: 'budisantoso',
  })
  @IsOptional()
  @SanitizeText()
  @IsString({ message: 'Username harus berupa string' })
  username?: string;

  @ApiPropertyOptional({
    description: 'Password baru nasabah (opsional)',
    example: 'newpassword123',
  })
  @IsOptional()
  @IsString({ message: 'Password harus berupa string' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Nama nasabah',
    example: 'Budi Santoso',
  })
  @IsOptional()
  @SanitizeText()
  @IsString({ message: 'Nama nasabah harus berupa string' })
  namaNasabah?: string;

  @ApiPropertyOptional({
    description: 'Nomor telepon nasabah',
    example: '081298765432',
  })
  @IsOptional()
  @SanitizeText()
  @IsString({ message: 'Nomor telepon harus berupa string' })
  telp?: string;

  @ApiPropertyOptional({
    description: 'Alamat tempat tinggal nasabah',
    example: 'Jl. Merdeka No. 12',
  })
  @IsOptional()
  @SanitizeText()
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
