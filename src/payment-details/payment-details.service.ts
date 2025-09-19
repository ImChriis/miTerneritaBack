import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentDetails } from './entities/paymentDetail.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Event } from '../events/entities/event.entity';
import { User } from '../users/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { CreatePaymentDetailsDto } from './dto/create-payment-detail.dto';
import { UpdatePaymentDetailsStatusDto } from './dto/update-payment-detail-status.dto';

@Injectable()
export class PaymentDetailsService {
  constructor(
    @InjectRepository(PaymentDetails)
    private paymentDetailsRepository: Repository<PaymentDetails>,

    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,

    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,

    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,

    @InjectRepository(ConsumeDetails)
    private consumeDetailsRepository: Repository<ConsumeDetails>,
  ) {}

  async create(
    createPaymentDetailsDto: CreatePaymentDetailsDto,
  ): Promise<PaymentDetails> {
    const {
      idPayment,
      idEvent,
      idUser,
      idTicket,
      idConsumeDetails,
      scanned = false,
    } = createPaymentDetailsDto;

    const payment = await this.paymentsRepository.findOne({
      where: { id: idPayment },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const event = await this.eventsRepository.findOne({
      where: { id: idEvent },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const user = await this.usersRepository.findOne({ where: { id: idUser } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const ticket = await this.ticketsRepository.findOne({
      where: { id: idTicket },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    let consumeDetails: ConsumeDetails | null = null;
    if (idConsumeDetails) {
      consumeDetails = await this.consumeDetailsRepository.findOne({
        where: { id: idConsumeDetails },
      });
      if (!consumeDetails) {
        throw new NotFoundException('Detalle de consumo no encontrado');
      }
    }

    // Verificar si ya existe PaymentDetails para este payment y ticket
    const existing = await this.paymentDetailsRepository.findOne({
      where: { payment: { id: idPayment }, ticket: { id: idTicket } },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya existe un registro para este pago y ticket',
      );
    }

    const paymentDetails = this.paymentDetailsRepository.create({
      payment,
      event,
      user,
      ticket,
      ...(consumeDetails ? { consumeDetails } : {}),
      scanned,
    });

    return this.paymentDetailsRepository.save(paymentDetails);
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdatePaymentDetailsStatusDto,
  ): Promise<PaymentDetails> {
    const paymentDetails = await this.paymentDetailsRepository.findOne({
      where: { id },
    });
    if (!paymentDetails) {
      throw new NotFoundException('Detalle de pago no encontrado');
    }

    paymentDetails.scanned = updateStatusDto.scanned;
    return this.paymentDetailsRepository.save(paymentDetails);
  }

  async findAll(): Promise<PaymentDetails[]> {
    return this.paymentDetailsRepository.find({
      relations: ['payment', 'event', 'user', 'ticket', 'consumeDetails'],
    });
  }

  async findOne(id: number): Promise<PaymentDetails> {
    const paymentDetails = await this.paymentDetailsRepository.findOne({
      where: { id },
      relations: ['payment', 'event', 'user', 'ticket', 'consumeDetails'],
    });
    if (!paymentDetails) {
      throw new NotFoundException('Detalle de pago no encontrado');
    }
    return paymentDetails;
  }
}
