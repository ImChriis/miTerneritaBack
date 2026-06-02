import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

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
    const {
      idUser,
      idEvents,
      noDocumento,
      date,
      time,
      totalBaseImponible,
      impuestoBaseImponible,
      totalExento,
      descuento,
      subtotalGeneral,
      porcentajeIgtf,
      totalIgtf,
      impuesto,
      porcentajeIva,
      totalGeneral,
      tasaDolar,
      montoDolar,
      comprobante,
      banco,
      referencia,
      fechaTransferencia,
      status,
    } = createPaymentDto;

  const user = await this.usersRepository.findOne({ where: { id: idUser } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const event = await this.eventsRepository.findOne({ where: { idEvents } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const payment = this.paymentsRepository.create({
      idUser: user,
      idEvents: event,
      noDocumento,
      date,
      time,
      totalBaseImponible,
      impuestoBaseImponible,
      totalExento,
      descuento,
      subtotalGeneral,
      porcentajeIgtf,
      totalIgtf,
      impuesto,
      porcentajeIva,
      totalGeneral,
      tasaDolar,
      montoDolar,
      comprobante,
      banco,
      referencia,
      fechaTransferencia,
      status,
    });

    return this.paymentsRepository.save(payment);
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: id },
      relations: ['idUser', 'idEvents', 'consumeDetails', 'paymentDetails'],
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['idUser', 'idEvents', 'consumeDetails', 'paymentDetails'],
    });
  }
}
