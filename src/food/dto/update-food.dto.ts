import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  Min,
  Max,
  IsNumber,
  IsInt,
  MaxLength,
} from 'class-validator';
import {
  MAX_DESCRIPCION_PRODUCTO,
  MAX_PRECIO_PRODUCTO,
} from '../../common/producto-limites';

export class UpdateFoodDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_PRODUCTO)
  @Type(() => String)
  readonly description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_PRECIO_PRODUCTO)
  @Type(() => Number)
  readonly price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  readonly status?: number;

  @IsOptional()
  @IsString()
  @Type(() => String)
  readonly image?: string;
}
