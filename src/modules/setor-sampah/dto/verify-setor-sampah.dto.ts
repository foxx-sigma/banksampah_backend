import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusSetor } from '@prisma/client';
import { VerifyItemSetorDto } from './verify-item-setor.dto.js';

export class VerifySetorSampahDto {
  @ApiProperty({
    description: 'Status verifikasi baru oleh admin',
    enum: StatusSetor,
    example: 'selesai',
  })
  @IsEnum(StatusSetor, {
    message:
      'status harus salah satu dari: menunggu_konfirmasi, diverifikasi, ditolak, selesai',
  })
  status: StatusSetor;

  @ApiPropertyOptional({
    description: 'Catatan admin terkait verifikasi / penolakan setoran',
    example: 'Penimbangan selesai, poin telah ditambahkan ke saldo nasabah',
  })
  @IsOptional()
  @IsString({ message: 'catatanAdmin harus berupa string' })
  catatanAdmin?: string;

  @ApiPropertyOptional({
    description: 'Rincian berat aktual hasil penimbangan admin',
    type: [VerifyItemSetorDto],
  })
  @IsOptional()
  @IsArray({ message: 'itemsReal harus berupa array' })
  @ValidateNested({ each: true })
  @Type(() => VerifyItemSetorDto)
  itemsReal?: VerifyItemSetorDto[];
}
