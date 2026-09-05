import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusPenukaran } from '@prisma/client';

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
  @IsString({ message: 'catatan harus berupa string' })
  catatan?: string;
}
