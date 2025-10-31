import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsInt,
} from 'class-validator';

export class UpdateDrinkDto {
  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  readonly status?: number;

  @IsString()
  @IsOptional()
  readonly image?: string;
}
