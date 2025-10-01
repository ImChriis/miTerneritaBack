import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('PaymentMethod')
export class PaymentMethod {
  @PrimaryGeneratedColumn({ name: 'idMethod' })
  idMethod: number;

  @Column({ length: 255, nullable: true })
  description: string;

}
