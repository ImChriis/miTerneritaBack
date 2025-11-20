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
import { CreatePaymentDetailsDto } from '../../payment-details/dto/create-payment-detail.dto';

export class CreatePaymentDto {
  @IsInt()
  readonly idUser: number;

  @IsInt()
  readonly idEvents: number;

  @IsInt()
  readonly idConsumeDetails?: number;

  @IsInt()
  readonly idTicket: number;

  @IsInt()
  @Min(1)
  readonly ticketNum: number;

  @IsString()
  readonly noDocumento?: string;

  @IsString()
  readonly date: string;

  // @IsNumber()
  // readonly totalBaseImponible?: number;

  // @IsNumber()
  // readonly impuestoBaseImponible?: number;

  // @IsNumber()
  // readonly totalExento?: number;

  // @IsNumber()
  // readonly descuento?: number;

  // @IsNumber()
  // readonly subtotalGeneral?: number;

  // @IsNumber()
  // readonly porcentajeIgtf?: number;

  // @IsNumber()
  // readonly totalIgtf?: number;

  // @IsNumber()
  // readonly impuesto?: number;

  // @IsNumber()
  // readonly porcentajeIva?: number;

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

  @IsInt()
  readonly status: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentDetailsDto)
  readonly paymentDetails?: CreatePaymentDetailsDto[];

}
