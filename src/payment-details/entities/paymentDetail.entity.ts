import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { ConsumeDetails } from '../../consumeDetails/entities/consumeDetail.entity';

@Entity('PaymentDetails')
@Unique(['payment', 'ticket'])
export class PaymentDetails {
  @PrimaryGeneratedColumn({ name: 'idPaymentDetails' })
  id: number;

  @ManyToOne(() => Payment, (payment) => payment.paymentDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idPayment' })
  payment: Payment;

  @ManyToOne(() => Event, { eager: true })
  @JoinColumn({ name: 'idEvent' })
  event: Event;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'idUser ' })
  user: User;

  @ManyToOne(() => Ticket, { eager: true })
  @JoinColumn({ name: 'idTicket' })
  ticket: Ticket;

  @ManyToOne(() => ConsumeDetails, { nullable: true })
  @JoinColumn({ name: 'idConsumeDetails' })
  consumeDetails: ConsumeDetails;

  @Column({ default: false })
  scanned: boolean;
}
