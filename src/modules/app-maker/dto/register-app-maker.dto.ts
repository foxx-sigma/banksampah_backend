import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAppMakerDto {
  @ApiProperty({
    description: 'Alamat email pembuat aplikasi / tenant',
    example: 'siswa@example.com',
  })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @ApiProperty({
    description: 'Kata sandi minimal 6 karakter',
    example: 'password123',
    minLength: 6,
  })
  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @ApiProperty({
    description: 'Nama lengkap siswa pembuat aplikasi',
    example: 'Budi Pratama',
  })
  @IsString({ message: 'Nama siswa harus berupa string' })
  @IsNotEmpty({ message: 'Nama siswa tidak boleh kosong' })
  namaSiswa: string;

  @ApiProperty({
    description: 'Kelas atau tingkatan siswa',
    example: 'XII RPL 1',
  })
  @IsString({ message: 'Kelas harus berupa string' })
  @IsNotEmpty({ message: 'Kelas tidak boleh kosong' })
  kelas: string;

  @ApiProperty({
    description: 'Nama aplikasi bank sampah',
    example: 'Bank Sampah Digital Bersih Sejahtera',
  })
  @IsString({ message: 'Nama aplikasi harus berupa string' })
  @IsNotEmpty({ message: 'Nama aplikasi tidak boleh kosong' })
  namaApp: string;
}
