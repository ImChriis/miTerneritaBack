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
  idTicket?: number;

  @Column({ length: 150 })
  name?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price?: number;

  @Column({ type: 'tinyint', default: 1 })
  status?: number;

  /** 0 cuando el admin lo borra teniendo ventas (borrado logico). */
  @Column({ type: 'tinyint', default: 1 })
  activo?: number;

  @Column({ type: 'int', nullable: true })
  idEvents?: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'idEvents' })
  events?: Event;
}
