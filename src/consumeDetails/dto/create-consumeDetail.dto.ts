import { IsInt, Min } from 'class-validator';
import { CreatePaymentConsumoDto } from '../../payments/dto/create-payment-consumo.dto';

/**
 * Correccion del admin sobre el consumo de un pago Pendiente.
 *
 * Hereda las reglas de una linea de consumo de la compra (idFood o idDrinks,
 * y cantidad). Ya no acepta totalConsume ni foodAmount/drinksAmount: el
 * total lo calcula el backend con el precio del producto.
 */
export class CreateConsumeDetailDto extends CreatePaymentConsumoDto {
  @IsInt()
  @Min(1)
  readonly idPayment: number;
}
