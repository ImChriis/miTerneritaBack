import {
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

  @Column({ name: 'foodAmount', type: 'int', default: 0, nullable: true})
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
}
