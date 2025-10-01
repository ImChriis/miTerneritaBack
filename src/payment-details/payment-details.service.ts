import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger, 
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
import { MailService } from '../mail/mail.service';

@Injectable()
export class PaymentDetailsService {
  private readonly logger = new Logger(PaymentDetailsService.name);

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

    private readonly mailService: MailService,
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
      where: { idPayment: idPayment },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const event = await this.eventsRepository.findOne({
      where: { idEvents: idEvent },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const user = await this.usersRepository.findOne({ where: { id: idUser } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const ticket = await this.ticketsRepository.findOne({
      where: { idTicket: idTicket },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    let consumeDetails: ConsumeDetails | null = null;
    if (idConsumeDetails) {
      consumeDetails = await this.consumeDetailsRepository.findOne({
        where: { idConsumeDetails: idConsumeDetails },
      });
      // Si no existe, simplemente se deja como null (opcional)
    }

    // Verificar si ya existe PaymentDetails para este payment y ticket
    const existing = await this.paymentDetailsRepository.findOne({
      where: { payment: { idPayment: idPayment }, ticket: { idTicket: idTicket } },
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

    const savedPaymentDetails = await this.paymentDetailsRepository.save(paymentDetails);

    // No enviamos correo en la creación, solo en la actualización a 'scanned: true'
    // if (savedPaymentDetails.scanned) {
    //   await this.mailService.sendTicketScannedConfirmation(savedPaymentDetails);
    // }

    return savedPaymentDetails;
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdatePaymentDetailsStatusDto,
  ): Promise<PaymentDetails> {
    // Cargar PaymentDetails con las relaciones necesarias para el correo
    const paymentDetails = await this.paymentDetailsRepository.findOne({
      where: { id },
      relations: ['user', 'event', 'ticket', 'payment'], // Asegúrate de cargar estas relaciones
    });
    if (!paymentDetails) {
      throw new NotFoundException('Detalle de pago no encontrado');
    }

    // Solo enviar correo si el estado cambia a 'scanned: true' y antes no lo estaba
    const shouldSendEmail = !paymentDetails.scanned && updateStatusDto.scanned === true;

    paymentDetails.scanned = updateStatusDto.scanned;
    const updatedPaymentDetails = await this.paymentDetailsRepository.save(paymentDetails);

    if (shouldSendEmail) {
      this.logger.log(`PaymentDetail ID ${id} actualizado a scanned: true. Enviando correo...`);
      await this.mailService.sendTicketScannedConfirmation(updatedPaymentDetails);
    }

    return updatedPaymentDetails;
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
