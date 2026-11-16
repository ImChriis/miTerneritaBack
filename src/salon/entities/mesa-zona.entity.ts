import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Zona (tipo de entrada) de cada mesa en un evento: la mesa 5 es VIP, la 20
 * General... La asigna el admin en el mapa del salon. Una mesa sin fila no se
 * vende en ese evento.
 */
@Entity('mesa_zona')
export class MesaZona {
  @PrimaryColumn('int')
  idEvents: number;

  @PrimaryColumn('int')
  mesa: number;

  @Column('int')
  idTicket: number;
}
