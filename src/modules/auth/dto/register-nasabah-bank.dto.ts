import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterNasabahBankDto {
  @ApiProperty({
    description: 'Username akun nasabah',
    example: 'nasabah_andi',
  })
  @IsString({ message: 'Username harus berupa string' })
  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  username: string;

  @ApiProperty({
    description: 'Password akun nasabah (minimal 6 karakter)',
    example: 'password123',
    minLength: 6,
  })
  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @ApiProperty({
    description: 'Nama lengkap nasabah',
    example: 'Andi Pratama',
  })
  @IsString({ message: 'Nama nasabah harus berupa string' })
  @IsNotEmpty({ message: 'Nama nasabah tidak boleh kosong' })
  namaNasabah: string;

  @ApiProperty({
    description: 'Alamat tempat tinggal nasabah',
    example: 'Jl. Melati No. 12, Kel. Sukamaju',
  })
  @IsString({ message: 'Alamat harus berupa string' })
  @IsNotEmpty({ message: 'Alamat tidak boleh kosong' })
  alamat: string;

  @ApiProperty({
    description: 'Nomor telepon / WhatsApp nasabah',
    example: '081234567890',
  })
  @IsString({ message: 'Nomor telepon harus berupa string' })
  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  telp: string;

  @ApiPropertyOptional({
    description: 'File foto profil nasabah (JPG, PNG, atau WEBP, maks 5MB)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  foto?: any;
}
