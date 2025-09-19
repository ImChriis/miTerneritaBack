import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Food')
export class Food {
  @PrimaryGeneratedColumn({ name: 'idFood' })
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('tinyint')
  status: number;
}
