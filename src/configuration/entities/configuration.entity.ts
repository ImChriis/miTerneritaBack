import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Configuration')
export class Configuration {
  @PrimaryGeneratedColumn({ name: 'idConfiguration' })
  idConfiguration: number;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  instagram: string;

  @Column('decimal', { nullable: true })
  tasaDolar: number;

  @Column('decimal', { nullable: true })
  BCV: number;

}
