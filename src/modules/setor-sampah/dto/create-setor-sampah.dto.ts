import {
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemSetorDto } from './item-setor.dto.js';

export class CreateSetorSampahDto {
  @IsOptional()
  @IsString({ message: 'tanggal harus berupa string tanggal ISO 8601' })
  tanggal?: string;

  @IsOptional()
  @IsString({ message: 'catatan harus berupa string' })
  catatan?: string;

  @IsArray({ message: 'items harus berupa array' })
  @ArrayMinSize(1, { message: 'items minimal berisi 1 item penyetoran' })
  @ValidateNested({ each: true })
  @Type(() => ItemSetorDto)
  items: ItemSetorDto[];
}
