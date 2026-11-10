import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entradas apartadas mientras el cliente paga. Cuentan para el aforo hasta
 * `vence`; al crear el pago se borran. Una por usuario y evento.
 */
@Entity('reserva')
export class Reserva {
  @PrimaryGeneratedColumn({ name: 'idReserva' })
  idReserva: number;

  @Column('int')
  idEvents: number;

  @Column('int')
  idUser: number;

  @Column('int')
  cantidad: number;

  @Column({ type: 'datetime' })
  vence: Date;
}
