import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Cuantas personas de un tipo de entrada pasan en este escaneo. */
export class RedeemItemDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idTicket: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly cantidad: number;
}

/**
 * POST /code/redeem. El personal confirma cuantas personas de cada tipo pasan
 * ahora; el resto del QR queda para quien llegue despues.
 */
export class RedeemCodeDto {
  @IsString()
  @Length(32, 128)
  readonly token: string;

  /** Evento activo en la app: un QR de otro evento se rechaza. */
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idEvents: number;

  /**
   * Opcional. UUID que genera la app por cada escaneo y reutiliza si reintenta
   * la misma peticion: asi un reintento por mala cobertura no descuenta dos
   * veces. Sin el, cada peticion cuenta como un escaneo nuevo.
   */
  @IsOptional()
  @IsUUID()
  readonly scanId?: string;

  /** Nombre de la puerta configurado en la app, para el registro. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly puerta?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Indica al menos un tipo de entrada' })
  @ValidateNested({ each: true })
  @Type(() => RedeemItemDto)
  readonly entradas: RedeemItemDto[];
}
