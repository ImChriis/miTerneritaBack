import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Una sesion del sitio publico. Anonima: sin IP ni usuario. */
@Entity('visita')
export class Visita {
  @PrimaryColumn({ type: 'char', length: 36 })
  sesion: string;

  /** Id anonimo del navegador: separa visitantes nuevos de recurrentes. */
  @Column({ type: 'char', length: 36 })
  visitante: string;

  @Column({ length: 10 })
  dispositivo: string;

  @Column({ type: 'datetime' })
  inicio: Date;

  /** Ultima senal (navegacion o latido de cada minuto). */
  @Column({ type: 'datetime' })
  ultimo: Date;

  @Column({ type: 'int', default: 0 })
  paginas: number;
}
