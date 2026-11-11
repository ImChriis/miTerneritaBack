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

  /** Puestos que acepta el formulario de empleo, separados por coma. */
  @Column({ length: 255, default: 'Cocina,Bartender' })
  puestosAbiertos: string;

  // Cuentas que reciben los pagos; las muestra la pantalla de pago.
  @Column({ type: 'varchar', length: 100, nullable: true })
  pmBanco: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pmCedula: string | null;


  @Column({ type: 'varchar', length: 100, nullable: true })
  pmTelefono: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  zelleTitular: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  zelleTelefono: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  zelleCorreo: string | null;
}
