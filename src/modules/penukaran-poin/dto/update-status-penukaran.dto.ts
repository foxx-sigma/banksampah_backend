import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusPenukaran } from '@prisma/client';
import { SanitizeText } from '../../../common/decorators/sanitize.decorator.js';

export class UpdateStatusPenukaranDto {
  @ApiProperty({
    description: 'Status baru proses penukaran hadiah',
    enum: StatusPenukaran,
    example: 'selesai',
  })
  @IsEnum(StatusPenukaran, {
    message: 'status harus salah satu dari: diproses, selesai',
  })
  status: StatusPenukaran;

  @ApiPropertyOptional({
    description: 'Catatan admin terkait serah terima hadiah',
    example: 'Hadiah telah diambil langsung oleh nasabah di kantor bank sampah',
  })
  @IsOptional()
  @SanitizeText()
  @IsString({ message: 'catatan harus berupa string' })
  catatan?: string;
}
