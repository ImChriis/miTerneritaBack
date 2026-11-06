import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsInt,
  MaxLength,
} from 'class-validator';
import {
  MAX_DESCRIPCION_PRODUCTO,
  MAX_DETALLE_PRODUCTO,
  MAX_PRECIO_PRODUCTO,
} from '../../common/producto-limites';

export class CreateFoodDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_DESCRIPCION_PRODUCTO)
  @Type(() => String)
  readonly description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_PRECIO_PRODUCTO)
  @Type(() => Number)
  readonly price?: number;

  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  readonly status?: number;

  @IsString()
  @IsOptional()
  @Type(() => String)
  readonly image?: string;

  /** Descripcion corta o variante. Opcional. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DETALLE_PRODUCTO)
  @Type(() => String)
  readonly detalle?: string;

  /** Posicion en la carta (menor primero). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  @Type(() => Number)
  readonly orden?: number;
}
