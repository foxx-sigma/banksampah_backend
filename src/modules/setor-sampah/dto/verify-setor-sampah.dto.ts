import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StatusSetor } from '@prisma/client';
import { VerifyItemSetorDto } from './verify-item-setor.dto.js';

export class VerifySetorSampahDto {
  @IsEnum(StatusSetor, {
    message:
      'status harus salah satu dari: menunggu_konfirmasi, diverifikasi, ditolak, selesai',
  })
  status: StatusSetor;

  @IsOptional()
  @IsString({ message: 'catatanAdmin harus berupa string' })
  catatanAdmin?: string;

  @IsOptional()
  @IsArray({ message: 'itemsReal harus berupa array' })
  @ValidateNested({ each: true })
  @Type(() => VerifyItemSetorDto)
  itemsReal?: VerifyItemSetorDto[];
}
