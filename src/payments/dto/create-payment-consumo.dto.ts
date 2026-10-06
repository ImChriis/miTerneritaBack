import { Type } from 'class-transformer';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';

/**
 * Tope por producto en una compra (despues de juntar lineas repetidas). Evita
 * pedidos absurdos y que el total desborde totalConsume decimal(10,2).
 */
export const MAX_CANTIDAD_CONSUMO = 50;

/**
 * Una linea de consumo: una comida O una bebida, y cuantas.
 *
 * Igual que con las entradas, el precio no se recibe: el backend lo toma de
 * las tablas `food` y `drinks`.
 */
export class CreatePaymentConsumoDto {
  // Obligatorio si no viene idDrinks. Que no vengan los dos a la vez se
  // comprueba en el servicio, con un mensaje claro.
  @ValidateIf((o: CreatePaymentConsumoDto) => o.idDrinks === undefined)
  @IsInt({ message: 'Cada consumo necesita idFood o idDrinks' })
  @Min(1)
  @Type(() => Number)
  readonly idFood?: number;

  @ValidateIf((o: CreatePaymentConsumoDto) => o.idFood === undefined)
  @IsInt({ message: 'Cada consumo necesita idFood o idDrinks' })
  @Min(1)
  @Type(() => Number)
  readonly idDrinks?: number;

  @IsInt()
  @Min(1)
  @Max(MAX_CANTIDAD_CONSUMO, {
    message: `Maximo ${MAX_CANTIDAD_CONSUMO} unidades por producto`,
  })
  @Type(() => Number)
  readonly cantidad: number;
}
