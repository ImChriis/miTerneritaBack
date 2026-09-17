import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Contador de numeros de documento. Tabla creada por
 * db/migrations/2026-09-17-payment-numero-documento.sql.
 *
 * Se usa en lugar de MAX(noDocumento) + 1 porque dos compras simultaneas de
 * eventos distintos no se bloquean entre si y podian sacar el mismo numero.
 * Incrementar esta fila dentro de la transaccion de la compra las pone en fila
 * y, si la compra falla, el incremento se deshace: no quedan huecos.
 */
@Entity('document_sequence')
export class DocumentSequence {
  @PrimaryColumn({ length: 50 })
  name: string;

  // BIGINT: el driver lo devuelve como string para no perder precision.
  @Column({ name: 'last_value', type: 'bigint', unsigned: true, default: 0 })
  lastValue: string;
}
