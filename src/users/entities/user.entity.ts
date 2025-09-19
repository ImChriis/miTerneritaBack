import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

@Entity('Users')
@Unique(['cedula'])
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn({ name: 'idUser' })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 20 })
  cedula: string;

  @Column({ length: 150 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'tinyint' })
  status: number;

  @CreateDateColumn({ name: 'fechaRegistro' })
  fechaRegistro: Date;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'idRol' })
  role: Role;
}
