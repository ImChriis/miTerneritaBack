import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Events')
export class Event {
  @PrimaryGeneratedColumn({ name: 'idEvents' })
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('date')
  date: Date;

  @Column('time')
  time: string;

  @Column({ length: 100, nullable: true })
  room: string;

  @Column('int')
  capacity: number;

  @Column({ length: 255, nullable: true })
  imageL: string;

  @Column({ length: 255, nullable: true })
  imageS: string;

  @Column('tinyint')
  status: number;
}
