import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * Una linea de la compra: que entrada y cuantas.
 *
 * El precio y el total NO se reciben del cliente: el backend los calcula con
 * el precio de la tabla `ticket`. Si se aceptaran, bastaria con editar la
 * peticion para comprar una entrada VIP pagando 0,01.
 */
export class CreatePaymentItemDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly idTicket: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  readonly cantidad: number;
}
