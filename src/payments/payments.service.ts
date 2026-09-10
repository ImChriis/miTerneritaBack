import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus } from './enums/payment-status.enum';

const PAYMENT_RELATIONS = [
  'idUser',
  'idEvents',
  'consumeDetails',
  'paymentDetails',
];

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,

    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const { idUser, idEvents, status, ...paymentData } = createPaymentDto;

    const user = await this.usersRepository.findOne({ where: { id: idUser } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const event = await this.eventsRepository.findOne({ where: { idEvents } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const payment = this.paymentsRepository.create({
      ...paymentData,
      idUser: user,
      idEvents: event,
      // `date` la rellena MySQL con su DEFAULT current_timestamp().
      status: status ?? PaymentStatus.Pendiente,
      isDeleted: false,
    });

    return this.paymentsRepository.save(payment);
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: id, isDeleted: false },
      relations: PAYMENT_RELATIONS,
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { isDeleted: false },
      relations: PAYMENT_RELATIONS,
      order: { idPayment: 'DESC' },
    });
  }

  /**
   * Un usuario con rol 'user' solo puede ver sus propios pagos. Antes
   * GET /payment/:id devolvia cualquier pago a cualquier usuario autenticado,
   * incluidos los datos personales del comprador.
   */
  async findOneForRequester(
    id: number,
    requesterId: number,
    requesterRole: string | null,
  ): Promise<Payment> {
    const payment = await this.findOne(id);

    if (requesterRole !== 'admin' && payment.idUser?.id !== requesterId) {
      // Se responde 404 y no 403 para no confirmar que el pago existe.
      throw new NotFoundException('Pago no encontrado');
    }

    return payment;
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.status = updateStatusDto.status;
    return this.paymentsRepository.save(payment);
  }

  /**
   * Borrado logico. Antes se llamaba a softDelete(), que necesita una columna
   * @DeleteDateColumn que esta entidad no tiene; la tabla marca el borrado con
   * la columna `isDeleted`.
   */
  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);
    payment.isDeleted = true;
    await this.paymentsRepository.save(payment);
  }
}
