import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Puestos a los que se puede postular (el front muestra la misma lista). */
export const PUESTOS = [
  'Mesonero/a',
  'Bartender',
  'Cocina',
  'Caja',
  'Limpieza',
  'Otro',
] as const;

/** Seguimiento que lleva el admin. Toda postulación nueva entra como "Nueva". */
export const ESTADOS_POSTULACION = [
  'Nueva',
  'Revisada',
  'Contactado',
  'Descartada',
] as const;

@Entity('postulacion')
export class Postulacion {
  @PrimaryGeneratedColumn({ name: 'idPostulacion' })
  idPostulacion: number;

  @Column({ length: 50 })
  nombre: string;

  @Column({ length: 50 })
  apellido: string;

  @Column({ length: 13 })
  cedula: string;

  @Column({ length: 80 })
  email: string;

  @Column({ length: 20 })
  telefono: string;

  @Column({ length: 30 })
  puesto: string;

  @Column({ type: 'text', nullable: true })
  mensaje: string | null;

  /** PDF en uploads/cv (privado); null si no adjunto CV. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  cv: string | null;

  /** Contenido del PDF (el disco de Render no persiste). No se carga en listados. */
  @Column({ type: 'mediumblob', nullable: true, select: false })
  cvData: Buffer | null;

  @Column({ length: 20, default: ESTADOS_POSTULACION[0] })
  estado: string;

  @CreateDateColumn({ type: 'datetime' })
  fecha: Date;
}
