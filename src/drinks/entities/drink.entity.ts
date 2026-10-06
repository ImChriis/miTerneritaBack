import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('drinks')
export class Drink {
  @PrimaryGeneratedColumn({ name: 'idDrinks' })
  idDrinks?: number;

  @Column({ length: 255 })
  description?: string;

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
}
