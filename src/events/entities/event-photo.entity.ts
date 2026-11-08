import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Foto de la galeria de un evento. Tabla creada por
 * db/migrations/2026-11-07-galeria-eventos.sql.
 */
@Entity('event_photo')
export class EventPhoto {
  @PrimaryGeneratedColumn({ name: 'idPhoto' })
  idPhoto: number;

  @Column('int')
  idEvents: number;

  /** Ruta relativa a /assets/img: 'galeria/<uuid>.webp'. */
  @Column({ length: 255 })
  image: string;

  @CreateDateColumn({ type: 'datetime' })
  fechaSubida: Date;
}
