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
import { Type, Transform } from 'class-transformer';
import { CreatePaymentDetailsDto } from '../../payment-details/dto/create-payment-detail.dto';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export class CreatePaymentDto {
  @IsInt()
  readonly idUser: number;

  @IsInt()
  readonly idEvents: number;

  @IsInt()
  readonly idConsumeDetails?: number;

  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map(v => String(v)); // Convertir a string cada elemento
    }
    if (typeof value === 'string') {
      // Si viene como string "[1, 2]", intentar parsear si es JSON válido, sino tratar como CSV
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(v => String(v));
      } catch (e) {}
      return value.split(',').map(v => v.trim());
    }
    return [String(value)];
  })
  @IsArray()
  @IsString({ each: true })
  readonly idTicket: string[];

  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(v => String(v));
      } catch (e) {}
      return value.split(',').map(v => v.trim());
    }
    return [String(value)];
  })
  @IsArray()
  @IsString({ each: true })
  readonly ticketNum: string[];

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

  @IsEnum(PaymentStatus)
  readonly status: PaymentStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentDetailsDto)
  readonly paymentDetails?: CreatePaymentDetailsDto[];

}
