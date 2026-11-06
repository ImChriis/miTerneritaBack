import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('food')
export class Food {
  @PrimaryGeneratedColumn({ name: 'idFood' })
  idFood?: number;

  /** Nombre del producto (nombre historico de la columna). */
  @Column({ length: 255 })
  description?: string;

  /** Descripcion corta o variante ("Botella", "Ron, hierbabuena..."). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  detalle?: string | null;

  @Column('decimal', { precision: 10, scale: 2 })
  price?: number;

  /** 1 a la venta, 0 agotado o no disponible. Lo cambia el admin. */
  @Column('tinyint')
  status?: number;

  @Column({ length: 255, nullable: true })
  image?: string;

  /**
   * 0 cuando el admin lo borra. Borrado logico: las facturas de compras
   * anteriores siguen apuntando a la fila (FK de consumedetails).
   */
  @Column({ type: 'tinyint', default: 1 })
  activo?: number;

  /** Posicion en la carta (menor primero). */
  @Column({ type: 'int', default: 0 })
  orden?: number;
}
