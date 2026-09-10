import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';

/**
 * Entrada de un pago aprobado.
 *
 * La columna `QR` guarda el token opaco que va codificado dentro de la imagen,
 * no la imagen: el PNG se genera al vuelo cuando hace falta. Asi la tabla no
 * engorda con base64 y el token no lleva ningun dato personal.
 */
@Entity('code')
export class Code {
  @PrimaryGeneratedColumn({ name: 'idCode' })
  idCode: number;

  @Column('text')
  QR: string;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idPayment' })
  payment: Payment;
}
