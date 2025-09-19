import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Matches,
} from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsDateString()
  readonly date?: string;

  @IsOptional()
  @IsString()
  readonly room?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  readonly capacity?: number;

  @IsOptional()
  @IsString()
  @Matches(/\.webp$/i, { message: 'La imagen debe ser formato .webp' })
  readonly imageL?: string;

  @IsOptional()
  @IsString()
  @Matches(/\.webp$/i, { message: 'La imagen debe ser formato .webp' })
  readonly imageS?: string;

  @IsOptional()
  @IsInt()
  readonly status?: number;
}
