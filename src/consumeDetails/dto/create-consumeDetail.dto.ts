import { IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateConsumeDetailDto {
  @IsOptional()
  @IsNumber()
  idFood?: number;

  @IsOptional()
  @IsNumber()
  foodAmount?: number;

  @IsOptional()
  @IsNumber()
  idDrinks?: number;

  @IsOptional()
  @IsNumber()
  drinksAmount?: number;

  @IsOptional()
  @IsNumber()
  idPayment?: number;

  @IsNotEmpty()
  @IsNumber()
  totalConsume?: number;
}
