import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('Roles')
@Unique(['name'])
export class Role {
  @PrimaryGeneratedColumn({ name: 'idRol' })
  id: number;

  @Column({ length: 100 })
  name: string;
}
