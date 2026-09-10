import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * La tabla `roles` no tenia entidad: se consultaba con SQL crudo desde
 * UsersService, con los nombres de tabla y columna escritos a mano.
 */
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ name: 'idRol' })
  idRol: number;

  @Column({ length: 100 })
  name: string;
}
