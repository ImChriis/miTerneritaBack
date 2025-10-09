import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity('ticket')
export class Ticket {
  @PrimaryGeneratedColumn()
  idTicket: number;

  @Column({ length: 150 })
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Event, (event) => event.tickets)
  @JoinColumn({ name: 'idEvents' })
  event: Event;

  @Column({ type: 'tinyint', default: 1 })
  status: number;
}
