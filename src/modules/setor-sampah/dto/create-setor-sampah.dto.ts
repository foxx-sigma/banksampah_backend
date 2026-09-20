import {
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeText } from '../../../common/decorators/sanitize.decorator.js';
import { ItemSetorDto } from './item-setor.dto.js';

export class CreateSetorSampahDto {
  @ApiPropertyOptional({
    description: 'Catatan tambahan dari nasabah',
    example: 'Kardus sudah diikat rapi dan botol sudah dibersihkan',
  })
  @IsOptional()
  @SanitizeText()
  @IsString({ message: 'catatan harus berupa string' })
  catatan?: string;

  @ApiPropertyOptional({
    description: 'Tanggal pengajuan setor sampah',
    example: '2026-09-20T00:00:00.000Z',
  })
  @IsOptional()
  @IsString({ message: 'tanggal harus berupa string format ISO/Date' })
  tanggal?: string;

  @ApiPropertyOptional({
    description: 'Foto bukti sampah yang disetorkan (JPG, PNG, WEBP maks 5MB)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  foto?: any;

  @ApiProperty({
    description: 'Daftar item sampah yang disetorkan (minimal 1)',
    type: [ItemSetorDto],
  })
  @Transform(({ value }) => {
    let parsed = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        return value;
      }
    }
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) =>
        item instanceof ItemSetorDto
          ? item
          : plainToInstance(ItemSetorDto, item),
      );
    }
    return parsed;
  })
  @IsArray({ message: 'items harus berupa array' })
  @ArrayMinSize(1, { message: 'items minimal berisi 1 item penyetoran' })
  @ValidateNested({ each: true })
  @Type(() => ItemSetorDto)
  items: ItemSetorDto[];
}
