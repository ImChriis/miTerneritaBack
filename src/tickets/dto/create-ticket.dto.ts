import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsOptional,
} from 'class-validator';
import {Type} from 'class-transformer';

export class CreateTicketDto {

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  status?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idEvents?: number;
}