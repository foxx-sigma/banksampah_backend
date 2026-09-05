import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAdminBankDto {
  @ApiProperty({
    description: 'Username akun admin bank sampah',
    example: 'admin_utama',
  })
  @IsString({ message: 'Username harus berupa string' })
  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  username: string;

  @ApiProperty({
    description: 'Password akun admin (minimal 6 karakter)',
    example: 'password123',
    minLength: 6,
  })
  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @ApiProperty({
    description: 'Nama unit bank sampah',
    example: 'Bank Sampah Unit Berkah Mandiri',
  })
  @IsString({ message: 'Nama unit harus berupa string' })
  @IsNotEmpty({ message: 'Nama unit tidak boleh kosong' })
  namaUnit: string;

  @ApiProperty({
    description: 'Nama lengkap pengelola / ketua admin',
    example: 'Siti Rahmawati',
  })
  @IsString({ message: 'Nama pengelola harus berupa string' })
  @IsNotEmpty({ message: 'Nama pengelola tidak boleh kosong' })
  namaPengelola: string;

  @ApiProperty({
    description: 'Nomor kontak telepon / WhatsApp admin',
    example: '081398765432',
  })
  @IsString({ message: 'Nomor telepon harus berupa string' })
  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  telp: string;
}
