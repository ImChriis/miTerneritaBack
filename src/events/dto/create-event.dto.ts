import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsOptional()
  readonly description?: string;

  @IsDateString()
  readonly date: string;

  @IsDateString()
  readonly time: string;

  @IsString()
  @IsOptional()
  readonly room?: string;

  @IsInt()
  @Min(1)
  readonly capacity: number;

  @IsString()
  @IsOptional()
  @Matches(/\.webp$/i, { message: 'La imagen debe ser formato .webp' })
  readonly imageL?: string;

  @IsString()
  @IsOptional()
  @Matches(/\.webp$/i, { message: 'La imagen debe ser formato .webp' })
  readonly imageS?: string;

  @IsInt()
  readonly status: number;
}
