import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * POST /code/validate (escaneo de un solo paso). Basta con token e idEvents;
 * sin idEvents pasaria un QR de otro evento.
 */
export class ValidateCodeDto {
  /** El token que lleva codificado el QR de la entrada. */
  @IsString()
  @Length(32, 128)
  readonly token: string;

  /** Evento activo en la app: un QR de otro evento se rechaza. */
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idEvents: number;

  /** Opcional, como en redeem: identifica el escaneo para reconocer reintentos. */
  @IsOptional()
  @IsUUID()
  readonly scanId?: string;

  /** Nombre de la puerta configurado en la app, para el registro. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly puerta?: string;
}
