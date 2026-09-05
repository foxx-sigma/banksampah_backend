import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePenukaranPoinDto {
  @IsString({ message: 'hadiahId harus berupa string UUID' })
  @IsNotEmpty({ message: 'hadiahId tidak boleh kosong' })
  hadiahId: string;

  @IsOptional()
  @IsString({ message: 'catatan harus berupa string' })
  catatan?: string;
}
