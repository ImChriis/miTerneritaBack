import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('paymentmethod')
export class PaymentMethod {
  @PrimaryGeneratedColumn({ name: 'idMethod' })
  idMethod: number;

  @Column({ length: 255, nullable: true })
  description: string;

}
