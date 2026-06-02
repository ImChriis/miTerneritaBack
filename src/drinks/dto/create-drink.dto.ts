import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
  IsInt,
} from 'class-validator';

export class CreateDrinkDto {
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  readonly description?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly price?: number;

  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  readonly status?: number;

  @IsString()
  @IsOptional()
  @Type(() => String)
  readonly image?: string;
}
