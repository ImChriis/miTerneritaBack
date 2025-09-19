import { IsInt, Min, IsOptional, ValidateIf } from 'class-validator';

export class CreateConsumeDetailDto {
  @IsOptional()
  @IsInt()
  readonly idFood?: number;

  @IsOptional()
  @IsInt()
  readonly idDrink?: number;

  @IsInt()
  readonly idPayment: number;

  @IsInt()
  @Min(1)
  readonly quantity: number;
}
