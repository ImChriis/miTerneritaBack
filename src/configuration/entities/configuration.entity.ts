import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Configuration')
export class Configuration {
  @PrimaryGeneratedColumn({ name: 'idConfiguration' })
  id: number;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  instagram: string;

  @Column({ length: 100, nullable: true })
  BCV: string;

  @Column('decimal', { precision: 15, scale: 4, nullable: true })
  Dolar: number;
}
