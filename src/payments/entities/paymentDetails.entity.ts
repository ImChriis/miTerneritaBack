import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

@Entity('PaymentDetails')
export class PaymentDetails {
  
  @PrimaryGeneratedColumn({ name: 'idPaymentDetails' })
  id: number;

  @ManyToOne(() => Payment, (payment) => payment.paymentDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idPayment' })
  payment: Payment;

  @Column({ length: 100 })
  detailType: string; // e.g. 'ticket', 'food', 'drink'

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 15, scale: 2 })
  price: number;
}
