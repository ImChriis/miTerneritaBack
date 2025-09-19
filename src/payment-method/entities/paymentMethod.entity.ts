import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('PaymentMethods')
export class PaymentMethod {
  @PrimaryGeneratedColumn({ name: 'idPaymentMethod' })
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column('tinyint')
  status: number; // 0 = inactive, 1 = active
}
