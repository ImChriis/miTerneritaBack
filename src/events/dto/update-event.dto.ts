import {
  IsString,
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

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @Type(() => String)
  readonly name?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  readonly description?: string;

  @IsOptional()
  @IsDateString()
  @Type(() => String)
  readonly date?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTime(value))
  @Matches(TIME_REGEX, { message: TIME_MESSAGE })
  readonly time?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  readonly room?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly capacity?: number;

  @IsString()
  @IsOptional()
  @Matches(/\.webp$/i, { message: 'El archivo debe ser formato .webp' })
  @Type(() => String)
  readonly flyer?: string;

  @IsString()
  @IsOptional()
  @Matches(/\.webp$/i, { message: 'El archivo debe ser formato .webp' })
  @Type(() => String)
  readonly image1?: string;

  @IsString()
  @IsOptional()
  @Matches(/\.webp$/i, { message: 'El archivo debe ser formato .webp' })
  @Type(() => String)
  readonly image2?: string;

  @IsString()
  @IsOptional()
  @Matches(/\.webp$/i, { message: 'El archivo debe ser formato .webp' })
  @Type(() => String)
  readonly image3?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly status?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly consumo?: number;
}
