import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsOptional,
} from 'class-validator';

export class CreateDrinkDto {
  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @IsNumber()
  @Min(0)
  readonly price: number;

  @IsInt()
  @Min(0)
  @Max(1)
  readonly status: number;

  @IsString()
  @IsOptional()
  readonly image?: string;
}
