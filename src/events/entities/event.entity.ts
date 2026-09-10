import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  idEvents: number;

  @Column({ length: 150 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  // TypeORM entrega las columnas DATE como string 'AAAA-MM-DD', no como Date.
  @Column('date')
  date: string;

  @Column('time')
  time: string;

  @Column({ length: 100, nullable: true })
  room: string;

  @Column('int')
  capacity: number;

  @Column({ length: 255 })
  flyer: string;

  @Column({ length: 255 })
  image1: string;

  @Column({ length: 255 })
  image2: string;

  @Column({ length: 255 })
  image3: string;

  @Column('tinyint')
  status: number;

  @Column('int')
  consumo: number;
}
