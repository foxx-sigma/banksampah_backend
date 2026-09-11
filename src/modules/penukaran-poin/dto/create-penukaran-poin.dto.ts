import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeText } from '../../../common/decorators/sanitize.decorator.js';

export class CreatePenukaranPoinDto {
  @ApiProperty({
    description: 'ID UUID item hadiah yang ingin ditukarkan',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString({ message: 'hadiahId harus berupa string UUID' })
  @IsNotEmpty({ message: 'hadiahId tidak boleh kosong' })
  hadiahId: string;

  @ApiPropertyOptional({
    description: 'Catatan tambahan dari nasabah',
    example: 'Tolong siapkan warna hitam jika tersedia',
  })
  @IsOptional()
  @SanitizeText()
  @IsString({ message: 'catatan harus berupa string' })
  catatan?: string;
}
