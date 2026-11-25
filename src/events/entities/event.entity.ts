import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/** Tipos de evento. Solo los conciertos muestran el mapa del salon. */
export const CATEGORIAS_EVENTO = ['evento', 'concierto', 'fiesta'] as const;

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  idEvents: number;

  @Column({ length: 150 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  // TypeORM entrega las columnas DATE como string 'AAAA-MM-DD', no como Date.
  @Column('date')
  date: string;

  @Column('time')
  time: string;

  @Column({ length: 100, nullable: true })
  room: string;

  @Column('int')
  capacity: number;

  @Column({ length: 255 })
  flyer: string;

  @Column({ length: 255 })
  image1: string;

  /** Opcional: no se muestra en la web (solo flyer, image1 e image3). */
  @Column({ length: 255, nullable: true })
  image2: string | null;

  @Column({ length: 255 })
  image3: string;

  @Column('tinyint')
  status: number;

  /** 0 cuando el admin lo borra teniendo ventas (borrado logico). */
  @Column({ type: 'tinyint', default: 1 })
  activo?: number;

  /** 1 si el cliente puede pre-ordenar comida y bebida al comprar. */
  @Column('tinyint')
  consumo: number;

  /** Una de CATEGORIAS_EVENTO. */
  @Column({ length: 20, default: 'evento' })
  category: string;

  /** Desde este momento no se aparta ni se compra. null = sin cierre. */
  @Column({ type: 'datetime', nullable: true })
  cierreVenta: Date | null;
}
