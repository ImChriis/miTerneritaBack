import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

export class ZonaMesaDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly mesa: number;

  /** Tipo de entrada (General, VIP, Palco...) del evento. */
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idTicket: number;
}

/** Todas las mesas con zona del evento; las que no vienen quedan sin vender. */
export class UpdateZonasDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ZonaMesaDto)
  readonly zonas: ZonaMesaDto[];
}
