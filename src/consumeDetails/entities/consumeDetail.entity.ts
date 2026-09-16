import {
  AfterLoad,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Food } from '../../food/entities/food.entity';
import { Drink } from '../../drinks/entities/drink.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('consumedetails')
export class ConsumeDetails {
  @PrimaryGeneratedColumn({ name: 'idConsumeDetails' })
  idConsumeDetails: number;

  @ManyToOne(() => Food, { nullable: true })
  @JoinColumn({ name: 'idFood' })
  idFood: Food;

  @Column({ name: 'foodAmount', type: 'int', default: 0, nullable: true })
  foodAmount: number;

  @ManyToOne(() => Drink, { nullable: true })
  @JoinColumn({ name: 'idDrinks' })
  idDrinks: Drink;

  @Column({ name: 'drinksAmount', type: 'int', default: 0, nullable: true })
  drinksAmount: number;

  @ManyToOne(() => Payment, { nullable: false })
  @JoinColumn({ name: 'idPayment' })
  idPayment: Payment;

  @Column({ name: 'totalConsume', type: 'decimal', precision: 10, scale: 2 })
  totalConsume: number;

  /**
   * Campos calculados para la factura, no son columnas.
   *
   * La tabla guarda la cantidad en dos columnas distintas (foodAmount o
   * drinksAmount) y no guarda el precio unitario, solo el total. Se derivan
   * aqui para que el front pinte todas las lineas igual. El precio unitario
   * sale del total guardado, no del precio actual del producto: si la carta
   * cambia de precio, la factura de una compra antigua no se altera.
   */
  cantidad?: number;
  precioUnitario?: string;

  @AfterLoad()
  calcularCamposDeFactura() {
    // Cada linea es de comida o de bebida, nunca las dos: una de las
    // cantidades siempre es 0.
    this.cantidad = this.foodAmount || this.drinksAmount || 0;

    this.precioUnitario =
      this.cantidad > 0
        ? (
            Math.round(Number(this.totalConsume) * 100) /
            this.cantidad /
            100
          ).toFixed(2)
        : undefined;
  }
}
