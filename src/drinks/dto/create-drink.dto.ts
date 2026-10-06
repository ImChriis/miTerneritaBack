import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
  IsInt,
  IsNumber,
  MaxLength,
} from 'class-validator';
import {
  MAX_DESCRIPCION_PRODUCTO,
  MAX_PRECIO_PRODUCTO,
} from '../../common/producto-limites';

export class CreateDrinkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_DESCRIPCION_PRODUCTO)
  @Type(() => String)
  readonly description?: string;

  // DECIMAL(10,2) en la BD: antes era @IsInt() y una bebida de 4,50 daba 400.
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
}
