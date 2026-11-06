import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { CATEGORIAS_BEBIDA } from '../../common/producto-limites';

@Entity('drinks')
export class Drink {
  @PrimaryGeneratedColumn({ name: 'idDrinks' })
  idDrinks?: number;

  /** Nombre del producto (nombre historico de la columna). */
  @Column({ length: 255 })
  description?: string;

  /** Descripcion corta o variante ("Botella", "Ron, hierbabuena..."). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  detalle?: string | null;

  /** Seccion de la carta: una de CATEGORIAS_BEBIDA. */
  @Column({ type: 'varchar', length: 50, default: CATEGORIAS_BEBIDA[0] })
  categoria?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price?: number;

  /** 1 a la venta, 0 agotada o no disponible. Lo cambia el admin. */
  @Column('tinyint')
  status?: number;

  @Column({ length: 255, nullable: true })
  image?: string;

  /**
   * 0 cuando el admin la borra. Borrado logico: las facturas de compras
   * anteriores siguen apuntando a la fila (FK de consumedetails).
   */
  @Column({ type: 'tinyint', default: 1 })
  activo?: number;

  /** Posicion en la carta (menor primero). */
  @Column({ type: 'int', default: 0 })
  orden?: number;

  /**
   * Personas a las que la botella da acceso General (Old Parr Silver = 6).
   * 0 = no incluye acceso.
   */
  @Column({ type: 'int', default: 0 })
  personas?: number;
}
