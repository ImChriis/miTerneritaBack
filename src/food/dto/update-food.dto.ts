import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  Min,
  Max,
  IsNumber,
  IsInt,
} from 'class-validator';

export class UpdateFoodDto {
  @IsOptional()
  @IsString()
  @Type(() => String)
  readonly description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  readonly price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  readonly status?: number;

  @IsOptional()
  @IsString()
  @Type(() => String)
  readonly image?: string;
}
