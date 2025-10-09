import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsOptional,
} from 'class-validator';

export class CreateTicketDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsInt()
  idEvents?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}
