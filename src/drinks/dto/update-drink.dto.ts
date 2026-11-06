import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  Min,
  Max,
  IsInt,
  IsNumber,
  MaxLength,
  IsIn,
} from 'class-validator';
import {
  CATEGORIAS_BEBIDA,
  MAX_DESCRIPCION_PRODUCTO,
  MAX_DETALLE_PRODUCTO,
  MAX_PRECIO_PRODUCTO,
} from '../../common/producto-limites';

export class UpdateDrinkDto {
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

  @IsOptional()
  @IsIn(CATEGORIAS_BEBIDA, {
    message: `categoria debe ser una de: ${CATEGORIAS_BEBIDA.join(', ')}`,
  })
  readonly categoria?: string;

  /** Personas a las que la botella da acceso General; 0 = ninguna. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  readonly personas?: number;
}
