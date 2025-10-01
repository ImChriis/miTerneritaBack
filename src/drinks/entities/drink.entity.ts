import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Drinks')
export class Drink {
  @PrimaryGeneratedColumn({ name: 'idDrinks' })
  idDrinks: number;

  @Column({ length: 150 })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('tinyint')
  status: number;
}
