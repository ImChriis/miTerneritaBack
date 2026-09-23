import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ScanLog } from './scan-log.entity';

/**
 * Que linea del pago toco un escaneo y cuanto. Con esto se deshace con
 * exactitud aunque un pago tenga varias lineas del mismo tipo.
 */
@Entity('scan_log_detail')
export class ScanLogDetail {
  @PrimaryGeneratedColumn({ name: 'idScanDetail' })
  idScanDetail: number;

  @ManyToOne(() => ScanLog, (scan) => scan.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idScan' })
  scan: ScanLog;

  @Column({ type: 'int' })
  idPaymentDetails: number;

  @Column({ type: 'int' })
  idTicket: number;

  /** Nombre del tipo en el momento del escaneo, por si el ticket cambia despues. */
  @Column({ type: 'varchar', length: 150 })
  tipo: string;

  @Column({ type: 'int' })
  cantidad: number;
}
