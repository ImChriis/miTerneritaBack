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

@Entity('Payments')
export class Payment {
  @PrimaryGeneratedColumn({ name: 'idPayment' })
  idPayment: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'idUser ' })
  IdUser: User;

  @ManyToOne(() => Event, { eager: false })
  @JoinColumn({ name: 'idEvent' })
  IdEvent: Event;

  @Column('decimal', { precision: 15, scale: 2 })
  amountUSD: number;

  @Column('decimal', { precision: 15, scale: 2 })
  amountBS: number;

  @Column({ length: 10 })
  paymentMethod: 'USD' | 'BS';

  @Column({ length: 50 })
  status: string; // 'pending', 'completed', 'cancelled'

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @OneToMany(() => ConsumeDetails, (consumeDetails) => consumeDetails.idPayment, {
    cascade: true,
  })
  consumeDetails: ConsumeDetails[];

  @OneToMany(() => PaymentDetails, (paymentDetails) => paymentDetails.payment)
  paymentDetails: PaymentDetails[];
}
