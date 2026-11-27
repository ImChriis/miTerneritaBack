import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class ReservarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idEvents: number;

  /**
   * Personas que entran: las entradas elegidas en el paso 1. El cliente puede
   * apartar hasta 10 (lo comprueba el controlador); el admin, en el registro
   * asistido, hasta 50.
   */
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  readonly cantidad: number;

  /** Puestos elegidos en el mapa del salon ("5A", "31H"), si el evento tiene mesas. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @Matches(/^\d{1,2}[A-H]$/, { each: true, message: 'Puesto no valido' })
  readonly asientos?: string[];
}
