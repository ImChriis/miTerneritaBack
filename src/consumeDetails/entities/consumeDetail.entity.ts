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
  id: number;

  @ManyToOne(() => Food, { nullable: true })
  @JoinColumn({ name: 'idFood' })
  food: Food;

  @ManyToOne(() => Drink, { nullable: true })
  @JoinColumn({ name: 'idDrink' })
  drink: Drink;

  @ManyToOne(() => Payment, { nullable: false })
  @JoinColumn({ name: 'idPayment' })
  payment: Payment;

  @Column('int')
  quantity: number;
}
