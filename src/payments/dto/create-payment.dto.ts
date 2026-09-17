import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatePaymentItemDto } from './create-payment-item.dto';
import { CreatePaymentConsumoDto } from './create-payment-consumo.dto';
import { formDataArray } from '../../common/form-data';

/**
 * Crea el pago y sus lineas de paymentdetails en una sola peticion.
 *
 * Llega como multipart/form-data porque puede incluir el archivo del
 * comprobante: campo `comprobante`, opcional porque los pagos en efectivo no
 * lo tienen. Lo recoge el FileInterceptor del controlador y por eso no esta
 * en este DTO. En form-data todo llega como texto: de ahi los
 * @Type(() => Number) y el formDataArray de items y consumos.
 *
 * - noDocumento no se recibe: lo asigna el servidor con un contador.
 * - subtotalGeneral y totalGeneral no se reciben: los calcula el backend a
 *   partir de `items` y del precio de cada ticket.
 * - status tampoco: todo pago nace Pendiente y solo un admin lo aprueba con
 *   PATCH /payment/:id/status. Antes se aceptaba aqui, y un usuario podia
 *   crear su pago directamente como Aprobado.
 *
 * Ojo: el `?` de TypeScript no existe en tiempo de ejecucion. Sin @IsOptional
 * class-validator exige el campo.
 */
export class CreatePaymentDto {
  /**
   * Solo lo usa un admin para registrar un pago a nombre de otro usuario.
   * Para el rol `user` se ignora y se toma del token.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idUser?: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idEvents: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly totalBaseImponible?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly impuestoBaseImponible?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly totalExento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly descuento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly porcentajeIgtf?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly totalIgtf?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly impuesto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly porcentajeIva?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly tasaDolar?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly montoDolar?: number;

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

  /** Las entradas que se compran. Al menos una. */
  @Transform(formDataArray(CreatePaymentItemDto))
  @IsArray({ message: 'items debe ser una lista de entradas' })
  @ArrayMinSize(1, { message: 'Debes comprar al menos una entrada' })
  @ValidateNested({ each: true })
  readonly items: CreatePaymentItemDto[];

  /**
   * Comida y bebida, opcional. Solo se admite si el evento tiene consumo.
   * Solo se elige al comprar; despues, solo un admin puede corregirlo y
   * mientras el pago siga Pendiente.
   */
  @IsOptional()
  @Transform(formDataArray(CreatePaymentConsumoDto))
  @IsArray({ message: 'consumos debe ser una lista' })
  @ValidateNested({ each: true })
  readonly consumos?: CreatePaymentConsumoDto[];
}
