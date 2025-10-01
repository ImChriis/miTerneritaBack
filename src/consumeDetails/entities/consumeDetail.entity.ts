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

@Entity('ConsumeDetails')
export class ConsumeDetails {
  @PrimaryGeneratedColumn({ name: 'idConsumeDetails' })
  idConsumeDetails: number;

  @ManyToOne(() => Food, { nullable: true })
  @JoinColumn({ name: 'idFood' })
  idFood: Food;

  @ManyToOne(() => Food, { nullable: true })
  @JoinColumn({ name: 'foodAmount' })
  foodAmount: number;

  @ManyToOne(() => Drink, { nullable: true })
  @JoinColumn({ name: 'idDrink' })
  idDrink: Drink;

  @ManyToOne(() => Drink, { nullable: true })
  @JoinColumn({ name: 'drinksAmount' })
  drinksAmount: number;

  @ManyToOne(() => Payment, { nullable: false })
  @JoinColumn({ name: 'idPayment' })
  payment: Payment;

  @Column('int')
  quantity: number;
}
