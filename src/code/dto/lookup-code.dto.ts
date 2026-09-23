import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Min } from 'class-validator';

/**
 * POST /code/lookup. idEvents es el evento activo configurado en la app:
 * obligatorio, porque sin el un QR de otro evento con entradas libres pasaria.
 */
export class LookupCodeDto {
  @IsString()
  @Length(32, 128)
  readonly token: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idEvents: number;
}
