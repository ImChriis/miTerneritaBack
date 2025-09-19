import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('Code')
export class Code {
  @PrimaryGeneratedColumn({ name: 'idCode' })
  id: number;

  @Column('text')
  QR: string;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idPayment' })
  payment: Payment;
}
