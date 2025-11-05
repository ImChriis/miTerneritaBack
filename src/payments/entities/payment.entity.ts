import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { ConsumeDetails } from '../../consumeDetails/entities/consumeDetail.entity';
import { PaymentDetails } from '../../payment-details/entities/paymentDetail.entity';

@Entity('Payment')
export class Payment {
  @PrimaryGeneratedColumn({ name: 'idPayment' })
  idPayment: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'idUser' })
  idUser: User;

  @ManyToOne(() => Event, { eager: false })
  @JoinColumn({ name: 'idEvents' })
  idEvents: Event;

  @ManyToOne(() => ConsumeDetails, { eager: false })
  @JoinColumn({ name: 'idConsumeDetails' })
  idConsumeDetails: ConsumeDetails;

  @Column({ length: 100, nullable: true })
  noDocumento: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  time: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalBaseImponible: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  impuestoBaseImponible: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalExento: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  descuento: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  subtotalGeneral: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  porcentajeIgtf: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalIgtf: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  impuesto: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  porcentajeIva: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalGeneral: number;

  @Column('decimal', { precision: 15, scale: 4, nullable: true })
  tasaDolar: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  montoDolar: number;

  @Column({ length: 255, nullable: true })
  comprobante: string;

  @Column({ length: 100, nullable: true })
  banco: string;

  @Column({ length: 100, nullable: true })
  referencia: string;

  @Column({ type: 'date', nullable: true })
  fechaTransferencia: Date;

  @Column({ type: 'tinyint', width: 4 })
  status: number;

  @OneToMany(() => ConsumeDetails, (consumeDetails) => consumeDetails.idPayment, {
    cascade: true,
  })
  consumeDetails: ConsumeDetails[];

  @OneToMany(() => PaymentDetails, (paymentDetails) => paymentDetails.payment)
  paymentDetails: PaymentDetails[];

  @Column({default: false})
  isDeleted: boolean;

}
