import { IsEmail, IsNotEmpty } from 'class-validator';

export class CheckKeyDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;
}
