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
import { ConsumeDetails } from '../../consumeDetails/entities/consumeDetail.entity';

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

  @Column({ name: 'ticketNum', type: 'int', nullable: true }) // Nullable
  ticketNum: number;

  @Column({ name: 'precio', type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({
    name: 'totalBase',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  }) //Nullable por impuesto x
  totalBase: number;

  @Column({
    name: 'impuestoCalculado',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  }) //Nullable por impuesto x
  impuestoCalculado: number;

  @Column({
    name: 'total',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  }) // Nullable por impuesto x
  total: number;

  @Column({
    name: 'tasaDolarEvento',
    type: 'decimal',
    precision: 15,
    scale: 4,
    nullable: true,
  }) // Nullable por impuesto x
  tasaDolarEvento: number;

  @Column({
    name: 'totalDolarEvento',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  }) // Nullable por impuesto x
  totalDolarEvento: number;

  @Column({ name: 'idTicket', type: 'int' })
  idTicket: number;

  @ManyToOne(() => ConsumeDetails, { nullable: true })
  @JoinColumn({ name: 'idConsumeDetails' })
  idConsumeDetails: ConsumeDetails;

  @Column({ name: 'status', type: 'tinyint', nullable: true, default: 0 })
  status: number;

  // La columna es tinyint y se usa como booleano. Declararla como 'boolean'
  // hace que TypeORM convierta 0/1 <-> false/true en ambos sentidos, en vez
  // de devolver un number con tipo TypeScript boolean.
  @Column({ name: 'checked', type: 'boolean', default: false })
  checked: boolean;

  @Column({ name: 'isDeleted', type: 'boolean', default: false })
  isDeleted: boolean;
}
