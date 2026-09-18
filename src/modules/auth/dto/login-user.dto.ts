import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({
    description: 'Username akun nasabah atau admin',
    example: 'nasabah_andi',
  })
  @IsString({ message: 'Username harus berupa string' })
  @IsNotEmpty({ message: 'Username tidak boleh kosong' })
  @MaxLength(100, { message: 'Username maksimal 100 karakter' })
  username: string;

  @ApiProperty({
    description: 'Password akun',
    example: 'password123',
  })
  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MaxLength(72, { message: 'Password maksimal 72 karakter' })
  password: string;
}
