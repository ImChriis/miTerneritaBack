import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsInt,
} from 'class-validator';

export class CreateFoodDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsNumber()
  @Min(0)
  readonly price: number;

  @IsInt()
  @Min(0)
  @Max(1)
  readonly status: number;
}
