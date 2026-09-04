import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterAppMakerDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @IsString({ message: 'Nama siswa harus berupa string' })
  @IsNotEmpty({ message: 'Nama siswa tidak boleh kosong' })
  namaSiswa: string;

  @IsString({ message: 'Kelas harus berupa string' })
  @IsNotEmpty({ message: 'Kelas tidak boleh kosong' })
  kelas: string;

  @IsString({ message: 'Nama aplikasi harus berupa string' })
  @IsNotEmpty({ message: 'Nama aplikasi tidak boleh kosong' })
  namaApp: string;
}
