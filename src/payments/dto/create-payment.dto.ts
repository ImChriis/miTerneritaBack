import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentStatus } from '../enums/payment-status.enum';

/**
 * Solo idUser e idEvents son obligatorios: el resto de campos son las cifras
 * del comprobante, que el frontend puede enviar o no.
 *
 * Ojo: el `?` de TypeScript no existe en tiempo de ejecucion. Sin @IsOptional
 * class-validator exigia todos estos campos y el endpoint devolvia 400.
 */
export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  readonly idUser: number;

  @IsInt()
  @Min(1)
  readonly idEvents: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly noDocumento?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly totalBaseImponible?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly impuestoBaseImponible?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly totalExento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly descuento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly subtotalGeneral?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly porcentajeIgtf?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly totalIgtf?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly impuesto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly porcentajeIva?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly totalGeneral?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly tasaDolar?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly montoDolar?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly comprobante?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly banco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly referencia?: string;

  @IsOptional()
  @IsISO8601()
  readonly fechaTransferencia?: string;

  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: `status debe ser uno de: ${Object.values(PaymentStatus).join(', ')}`,
  })
  readonly status?: PaymentStatus;
}
