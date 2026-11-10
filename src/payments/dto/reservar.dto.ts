import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ReservarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idEvents: number;

  /** Personas que entran: las entradas elegidas en el paso 1. */
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  readonly cantidad: number;
}
