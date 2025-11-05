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

export class CreatePaymentDto {
  @IsInt()
  readonly idUser: number;

  @IsInt()
  readonly idEvents: number;

  @IsInt()
  readonly idConsumeDetails?: number;

  @IsString()
  readonly noDocumento?: string;

  @IsString()
  readonly date: string;

  @IsString()
  readonly time: string;

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

  // @IsNumber()
  // readonly totalGeneral?: number;

  // @IsNumber()
  // readonly tasaDolar?: number;

  // @IsNumber()
  // readonly montoDolar?: number;

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

}
