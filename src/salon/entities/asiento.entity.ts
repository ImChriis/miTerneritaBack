import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Un puesto del salon tomado en un evento. Apartado: idPayment null y `vence`
 * con la hora en que se libera (como en el cine). Vendido: con idPayment. Un
 * puesto libre no tiene fila; uno apartado y vencido cuenta como libre.
 */
@Entity('asiento')
export class Asiento {
  @PrimaryGeneratedColumn({ name: 'idAsiento' })
  idAsiento: number;

  @Column('int')
  idEvents: number;

  /** Mesa + letra: "5A". */
  @Column({ type: 'varchar', length: 5 })
  asiento: string;

  @Column('int')
  idUser: number;

  @Column({ type: 'int', nullable: true })
  idPayment: number | null;

  @Column({ type: 'datetime', nullable: true })
  vence: Date | null;
}
