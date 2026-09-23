import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ScanLogDetail } from './scan-log-detail.entity';

/**
 * - app: POST /code/redeem desde la app de puerta.
 * - validate: POST /code/validate (escaneo de un solo paso).
 * - manual: el admin marca o desmarca una linea en PATCH /payment-details.
 */
export type ScanOrigen = 'app' | 'validate' | 'manual';

/**
 * Un escaneo que descuenta entradas de un QR. Tabla creada por
 * db/migrations/2026-09-23-scan-log.sql. Nada se borra: deshacer rellena
 * undoneAt/undoneBy y devuelve las entradas.
 */
@Entity('scan_log')
export class ScanLog {
  @PrimaryGeneratedColumn({ name: 'idScan' })
  idScan: number;

  /** Lo genera la app por escaneo; un reintento con el mismo no descuenta dos veces. */
  @Column({ length: 64, unique: true })
  scanId: string;

  /** sha256 de la peticion: detecta un scanId reutilizado con otros datos. */
  @Column({ type: 'char', length: 64 })
  requestHash: string;

  @Column({ type: 'enum', enum: ['app', 'validate', 'manual'] })
  origen: ScanOrigen;

  @Column({ type: 'int' })
  idPayment: number;

  @Column({ type: 'int', nullable: true })
  idUser: number | null;

  // Solo lectura: la que se escribe es la columna idUser.
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'idUser' })
  usuario?: User;

  @Column({ type: 'int', nullable: true })
  idEvents: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  puerta: string | null;

  /** Entradas descontadas; negativo en correcciones manuales que liberan. */
  @Column({ type: 'int' })
  total: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ type: 'datetime', nullable: true })
  undoneAt: Date | null;

  @Column({ type: 'int', nullable: true })
  undoneBy: number | null;

  @OneToMany(() => ScanLogDetail, (detalle) => detalle.scan, {
    cascade: ['insert'],
  })
  detalles: ScanLogDetail[];
}
