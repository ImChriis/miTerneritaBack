import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('Roles')
@Unique(['name'])
export class Role {
  @PrimaryGeneratedColumn({ name: 'idRol' })
  idRol: number;

  @Column({ length: 100 })
  name: string;
}
