import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Drinks')
export class Drink {
  @PrimaryGeneratedColumn({ name: 'idDrink' })
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('tinyint')
  status: number;
}
