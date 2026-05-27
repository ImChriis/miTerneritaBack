import {
  IsInt,
  IsNumber,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

enum ConsumeDetailType {
  Ticket = 'ticket',
  Food = 'food',
  Drink = 'drink',
}

class ConsumeItemDto {
  @IsEnum(ConsumeDetailType)
  detailType: ConsumeDetailType;

  @ValidateIf((item) => item.detailType !== ConsumeDetailType.Ticket)
  @IsInt()
  @Min(1)
  totalConsume: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ValidateIf((item) => item.detailType === ConsumeDetailType.Food)
  @IsInt()
  @Min(1)
  foodAmount: number;

  @ValidateIf((item) => item.detailType === ConsumeDetailType.Drink)
  @IsInt()
  @Min(1)
  drinksAmount: number;

  // IDs for each type
  @ValidateIf((item) => item.detailType === ConsumeDetailType.Ticket)
  @IsInt()
  idTicket?: number;

  @ValidateIf((item) => item.detailType === ConsumeDetailType.Food)
  @IsInt()
  idFood?: number;

  @ValidateIf((item) => item.detailType === ConsumeDetailType.Drink)
  @IsInt()
  idDrinks?: number;

  @ValidateIf((item) => item.detailType === ConsumeDetailType.Ticket)
  @IsInt()
  @Min(1)
  ticketNum?: number;
}

export class CreatePaymentDto {
  @IsInt()
  readonly idUser: number;

  @IsInt()
  readonly idEvents: number;

  @IsOptional()
  @IsInt()
  readonly idConsumeDetails?: number;

  @IsString()
  readonly noDocumento?: string;

  @IsString()
  readonly date: string;

  @IsString()
  readonly time: string;

  @IsNumber()
  readonly totalBaseImponible?: number;

  @IsNumber()
  readonly impuestoBaseImponible?: number;

  @IsNumber()
  readonly totalExento?: number;

  @IsNumber()
  readonly descuento?: number;

  @IsNumber()
  readonly subtotalGeneral?: number;

  @IsNumber()
  readonly porcentajeIgtf?: number;

  @IsNumber()
  readonly totalIgtf?: number;

  @IsNumber()
  readonly impuesto?: number;

  @IsNumber()
  readonly porcentajeIva?: number;

  @IsNumber()
  readonly totalGeneral?: number;

  @IsNumber()
  readonly tasaDolar?: number;

  @IsNumber()
  readonly montoDolar?: number;

  @IsString()
  readonly comprobante?: string;

  @IsString()
  readonly banco?: string;

  @IsString()
  readonly referencia?: string;

  @IsString()
  readonly fechaTransferencia?: string;

  @IsOptional()
  @IsInt()
  readonly status: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumeItemDto)
  readonly consumeItems?: ConsumeItemDto[];
}
