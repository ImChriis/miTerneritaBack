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
      idEvents : idEvent,
      idUser,
      idTicket,
      idConsumeDetails,
      precio : price,
      checked = false,
      status = 0,
    } = createPaymentDetailsDto;

    // Obtener instancias completas de las entidades relacionadas
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

    let consumeDetails: ConsumeDetails | undefined = undefined;
    if (idConsumeDetails) {
      const found = await this.consumeDetailsRepository.findOne({
        where: { idConsumeDetails: idConsumeDetails },
      });
      consumeDetails = found ?? undefined; // Convert null to undefined
    }

    // Verificar si ya existe PaymentDetails para este payment y ticket
    const existing = await this.paymentDetailsRepository.findOne({
      where: {
        payment: { idPayment: idPayment },
        idTicket: { idTicket: idTicket },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya existe un registro para este pago y ticket',
      );
    }

    // Usar el precio del DTO o el precio del ticket si no se proporciona
    const finalPrice = price ?? ticket.price;

    const paymentDetails = this.paymentDetailsRepository.create({
      payment,
      idEvent: event,
      idUser: user,
      ticketNum: createPaymentDetailsDto.ticketNum,
      precio: finalPrice,
      totalBase : createPaymentDetailsDto.totalBase,
      impuestoCalculado : createPaymentDetailsDto.impuestoCalculado,
      total : createPaymentDetailsDto.total,
      tasaDolarEvento : createPaymentDetailsDto.tasaDolarEvento,
      totalDolarEvento : createPaymentDetailsDto.totalDolarEvento,
      idTicket: ticket,
      idConsumeDetails: consumeDetails,
      status,
      checked,
    });

    const savedPaymentDetails = await this.paymentDetailsRepository.save(
      paymentDetails,
    );
    return savedPaymentDetails;
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdatePaymentDetailsStatusDto,
  ): Promise<PaymentDetails> {
    const paymentDetails = await this.paymentDetailsRepository.findOne({
      where: { idPaymentDetails: id },
      relations: ['idUser', 'idEvent', 'idTicket', 'payment'],
    });
    if (!paymentDetails) {
      throw new NotFoundException('Detalle de pago no encontrado');
    }

    const shouldSendEmail =
      !paymentDetails.checked && updateStatusDto.checked === true;
      
    paymentDetails.checked = updateStatusDto.checked;
    const updatedPaymentDetails = await this.paymentDetailsRepository.save(paymentDetails);

    if (shouldSendEmail) {
      await this.mailService.sendTicketScannedConfirmation(updatedPaymentDetails);
    }
    return updatedPaymentDetails;
  }

    async findAll(): Promise<PaymentDetails[]> {
      return this.paymentDetailsRepository.find({
        where: { isDeleted: false },
        relations: ['payment', 'idEvent', 'idUser', 'idTicket', 'idConsumeDetails'],
      });
    }

  async findOne(id: number): Promise<PaymentDetails> {
    const paymentDetails = await this.paymentDetailsRepository.findOne({
      where: { idPaymentDetails: id, isDeleted: false },
      relations: ['payment', 'idEvent', 'idUser', 'idTicket', 'idConsumeDetails'],
    });
    if (!paymentDetails) {
      throw new NotFoundException('Detalle de pago no encontrado');
    }
    return paymentDetails;
  }

    async softDelete(id: number): Promise<void> {
    const paymentDetails = await this.paymentDetailsRepository.findOne({ where: { idPaymentDetails: id } });
    if (!paymentDetails) {
      throw new NotFoundException('Detalle de pago no encontrado');
    }
    paymentDetails.isDeleted = true;
    await this.paymentDetailsRepository.save(paymentDetails);
    this.logger.log(`PaymentDetails ID ${id} marcado como eliminado`);
  }
}
