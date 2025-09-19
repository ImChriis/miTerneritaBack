import {
  IsInt,
  IsNumber,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class ConsumeItemDto {
  @IsString()
  detailType: 'ticket' | 'food' | 'drink';

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreatePaymentDto {
  @IsInt()
  readonly idUser: number;

  @IsInt()
  readonly idEvent: number;

  @IsNumber()
  @Min(0)
  readonly amountUSD: number;

  @IsNumber()
  @Min(0)
  readonly amountBS: number;

  @IsEnum(['USD', 'BS'])
  readonly paymentMethod: 'USD' | 'BS';

  @IsString()
  readonly status: string; // e.g. 'pending'

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConsumeItemDto)
  readonly consumeItems: ConsumeItemDto[];
}
