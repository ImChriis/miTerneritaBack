import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('users')
@Unique(['cedula'])
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn({ name: 'idUser' })
  id?: number;

  @Column({ length: 100 })
  name?: string;

  @Column({ length: 100 })
  lastName?: string;

  @Column({ length: 20 })
  cedula?: string;

  @Column({ length: 150 })
  email?: string;

  // select: false -> nunca sale en un find() normal. Se estaba filtrando el
  // hash en cada respuesta que incluyera la relacion idUser (pagos, detalles
  // de pago...). Para el login hay que pedirla explicitamente con addSelect.
  @Column({ length: 255, select: false })
  password?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'tinyint' })
  status?: number;

  @Column({ name: 'idRol' })
  idRol?: number;

  // Relacion de solo lectura: la que se escribe es la columna idRol de arriba.
  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'idRol' })
  role?: Role;

  @CreateDateColumn({ name: 'fechaRegistro' })
  fechaRegistro?: Date;

  @Column({ type: 'varchar', nullable: true, select: false })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  resetPasswordExpires: Date | null;
}
