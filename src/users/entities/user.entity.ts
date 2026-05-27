import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('Users')
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

  @Column({ length: 255 })
  password?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'tinyint' })
  status?: number;

  @Column({ name: 'idRol' })
  idRol?: number;

  @CreateDateColumn({ name: 'fechaRegistro' })
  fechaRegistro?: Date;
}
