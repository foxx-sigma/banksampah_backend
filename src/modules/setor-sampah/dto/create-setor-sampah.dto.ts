import {
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeText } from '../../../common/decorators/sanitize.decorator.js';
import { ItemSetorDto } from './item-setor.dto.js';

export class CreateSetorSampahDto {
  @ApiPropertyOptional({
    description: 'Tanggal penyetoran sampah (format ISO 8601)',
    example: '2026-09-05T08:30:00.000Z',
  })
  @IsOptional()
  @IsString({ message: 'tanggal harus berupa string tanggal ISO 8601' })
  tanggal?: string;

  @ApiPropertyOptional({
    description: 'Catatan tambahan dari nasabah',
    example: 'Kardus sudah diikat rapi dan botol sudah dibersihkan',
  })
  @IsOptional()
  @SanitizeText()
  @IsString({ message: 'catatan harus berupa string' })
  catatan?: string;

  @ApiProperty({
    description: 'Daftar item sampah yang disetorkan (minimal 1)',
    type: [ItemSetorDto],
  })
  @IsArray({ message: 'items harus berupa array' })
  @ArrayMinSize(1, { message: 'items minimal berisi 1 item penyetoran' })
  @ValidateNested({ each: true })
  @Type(() => ItemSetorDto)
  items: ItemSetorDto[];
}
