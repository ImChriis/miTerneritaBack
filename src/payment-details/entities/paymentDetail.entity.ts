import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { ConsumeDetails } from '../../consumeDetails/entities/consumeDetail.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

@Entity('paymentdetails')
export class PaymentDetails {
  @PrimaryGeneratedColumn({ name: 'idPaymentDetails' })
  idPaymentDetails: number;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'idPayment' })
  payment: Payment;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'idEvents' })
  idEvent: Event;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idUser' })
  idUser: User;

  @Column({ name: 'ticketNum', type: 'int'}) 
  ticketNum: number;

  @Column({ name: 'precio', type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ name: 'totalBase', type: 'decimal', precision: 15, scale: 2, nullable: true }) //Nullable por impuesto x
  totalBase: number;

  @Column({ name: 'impuestoCalculado', type: 'decimal', precision: 15, scale: 2, nullable: true }) //Nullable por impuesto x
  impuestoCalculado: number;

  @Column({ name: 'total', type: 'decimal', precision: 15, scale: 2, nullable: true }) // Nullable por impuesto x
  total: number;

  @Column({ name: 'tasaDolarEvento', type: 'decimal', precision: 15, scale: 4, nullable: true }) // Nullable por impuesto x
  tasaDolarEvento: number;

  @Column({ name: 'totalDolarEvento', type: 'decimal', precision: 15, scale: 2, nullable: true }) // Nullable por impuesto x
  totalDolarEvento: number;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'idTicket' })
  idTicket: Ticket;

  @ManyToOne(() => ConsumeDetails, { nullable: true })
  @JoinColumn({ name: 'idConsumeDetails' })
  idConsumeDetails: ConsumeDetails;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ name: 'checked', type: 'tinyint' })
  checked: boolean;

  @Column({ default: false })
  isDeleted: boolean;
}