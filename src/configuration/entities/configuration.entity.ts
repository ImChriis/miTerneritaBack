import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('configuration')
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

  /** Tasa oficial BCV (Bs por USD). La actualiza TasaBcvService. */
  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  BCV: number;

  /** Fecha de la tasa BCV guardada. */
  @Column({ type: 'datetime', nullable: true })
  fechaBCV: Date | null;
}
