import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Food')
export class Food {
  @PrimaryGeneratedColumn({ name: 'idFood' })
  idFood: number;

  @Column({ length: 150 })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('tinyint')
  status: number;
}
