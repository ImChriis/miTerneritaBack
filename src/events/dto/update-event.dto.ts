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
  @IsDateString()
  readonly time?: string;

  @IsOptional()
  @IsString()
  readonly room?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  readonly capacity?: number;

  @IsString()
  @IsOptional()
  readonly flyer?: string;

  @IsString()
  @IsOptional()
  readonly image1?: string;

  @IsString()
  @IsOptional()
  readonly image2?: string;

  @IsString()
  @IsOptional()
  readonly image3?: string;

  @IsOptional()
  @IsInt()
  readonly status?: number;
}
