import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsDateString,
  IsIn,
  IsInt,
  Min,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  normalizeTime,
  TIME_REGEX,
  TIME_MESSAGE,
} from '../../common/normalize-time';
import { CATEGORIAS_EVENTO } from '../entities/event.entity';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  readonly name?: string;

  @IsString()
  @IsOptional()
  @Type(() => String)
  readonly description?: string;

  @IsDateString()
  @Type(() => String)
  readonly date?: string;

  @Transform(({ value }) => normalizeTime(value))
  @Matches(TIME_REGEX, { message: TIME_MESSAGE })
  readonly time?: string;

  @IsString()
  @IsOptional()
  @Type(() => String)
  readonly room?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly capacity?: number;

  // Flyer e Imagenes 1, 2 y 3
  @IsOptional()
  @IsString()
  @Type(() => String)
  @Matches(/\.webp$/i, { message: 'El archivo debe ser formato .webp' })
  readonly flyer?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  @Matches(/\.webp$/i, { message: 'El archivo debe ser formato .webp' })
  readonly image1?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  @Matches(/\.webp$/i, { message: 'El archivo debe ser formato .webp' })
  readonly image2?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  @Matches(/\.webp$/i, { message: 'El archivo debe ser formato .webp' })
  readonly image3?: string;

  // Status del evento (1: activo, 0: inactivo)
  @IsInt()
  @Type(() => Number)
  readonly status?: number;

  /**
   * 1 si el cliente puede pre-ordenar comida y bebida al comprar la entrada.
   * Antes aceptaba cualquier entero (consumo = 5 pasaba).
   */
  @IsIn([0, 1], {
    message: 'consumo debe ser 1 (permite pre-ordenar comida y bebida) o 0',
  })
  @Type(() => Number)
  readonly consumo?: number;

  /** evento (por defecto), concierto o fiesta. */
  @IsOptional()
  @IsIn(CATEGORIAS_EVENTO, {
    message: `category debe ser una de: ${CATEGORIAS_EVENTO.join(', ')}`,
  })
  readonly category?: string;

  /** Fecha y hora (ISO) en que se cierra la venta de entradas. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly cierreVenta?: Date;
}
