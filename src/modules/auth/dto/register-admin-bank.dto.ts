import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterAdminBankDto {
  @IsString({ message: 'Username harus berupa string' })
  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  username: string;

  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @IsString({ message: 'Nama unit harus berupa string' })
  @IsNotEmpty({ message: 'Nama unit tidak boleh kosong' })
  namaUnit: string;

  @IsString({ message: 'Nama pengelola harus berupa string' })
  @IsNotEmpty({ message: 'Nama pengelola tidak boleh kosong' })
  namaPengelola: string;

  @IsString({ message: 'Nomor telepon harus berupa string' })
  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  telp: string;
}
