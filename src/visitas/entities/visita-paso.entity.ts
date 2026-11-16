import { Column, Entity, PrimaryColumn } from 'typeorm';

export const PASOS_EMBUDO = [
  'evento',
  'entradas',
  'consumo',
  'datos',
  'pago',
  'pagado',
] as const;
export type PasoEmbudo = (typeof PASOS_EMBUDO)[number];

/** Primera vez que una visita llega a un paso de la compra de un evento. */
@Entity('visita_paso')
export class VisitaPaso {
  @PrimaryColumn({ type: 'char', length: 36 })
  sesion: string;

  @PrimaryColumn({ length: 10 })
  paso: PasoEmbudo;

  /** 0 = sin evento (p. ej. /concierto antes de cargar). */
  @PrimaryColumn('int')
  idEvents: number;

  @Column({ type: 'datetime' })
  creado: Date;
}
