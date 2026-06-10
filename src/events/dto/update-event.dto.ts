import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsDateString()
  @Type(() => String)
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
