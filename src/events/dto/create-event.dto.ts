import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
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

  // Consumo del evento si lleva o no
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly consumo?: number;
}
