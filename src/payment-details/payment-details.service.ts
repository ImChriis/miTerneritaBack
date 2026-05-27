import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { PaymentDetails } from './entities/paymentDetail.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Event } from '../events/entities/event.entity';
import { User } from '../users/entities/user.entity';
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

    @InjectRepository(ConsumeDetails)
    private consumeDetailsRepository: Repository<ConsumeDetails>,

    private readonly dataSource: DataSource,

    private readonly mailService: MailService,
  ) {}

  async create(
    createPaymentDetailsDto: CreatePaymentDetailsDto,
    manager?: EntityManager,
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
    const paymentRepository = manager
      ? manager.getRepository(Payment)
      : this.paymentsRepository;
    const eventsRepository = manager
      ? manager.getRepository(Event)
      : this.eventsRepository;
    const usersRepository = manager
      ? manager.getRepository(User)
      : this.usersRepository;
    const consumeDetailsRepository = manager
      ? manager.getRepository(ConsumeDetails)
      : this.consumeDetailsRepository;
    const paymentDetailsRepository = manager
      ? manager.getRepository(PaymentDetails)
      : this.paymentDetailsRepository;
    const queryExecutor = manager ?? this.dataSource;

    const payment = await paymentRepository.findOne({
      where: { idPayment: idPayment },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const event = await eventsRepository.findOne({
      where: { idEvents: idEvent },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const user = await usersRepository.findOne({ where: { id: idUser } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const ticketRows = await queryExecutor.query(
      'SELECT idTicket, name, price, status FROM ticket WHERE idTicket = ? LIMIT 1',
      [idTicket],
    );
    const ticket = ticketRows[0];
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    let consumeDetails: ConsumeDetails | undefined = undefined;
    if (idConsumeDetails) {
      const found = await consumeDetailsRepository.findOne({
        where: { idConsumeDetails: idConsumeDetails },
      });
      consumeDetails = found ?? undefined; // Convert null to undefined
    }

    // Verificar si ya existe PaymentDetails para este payment y ticket
    const existing = await paymentDetailsRepository.findOne({
      where: {
        payment: { idPayment: idPayment },
        idTicket: idTicket,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya existe un registro para este pago y ticket',
      );
    }

    // Usar el precio del DTO o el precio del ticket si no se proporciona
    const finalPrice = price ?? ticket.price;

    const paymentDetails = paymentDetailsRepository.create({
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
      idTicket: idTicket,
      idConsumeDetails: consumeDetails,
      status,
      checked,
    });

    const savedPaymentDetails = await paymentDetailsRepository.save(
      paymentDetails,
    );
    return savedPaymentDetails;
  }

  // ...existing code...
async updateStatus(
  id: number,
  updateStatusDto: UpdatePaymentDetailsStatusDto,
): Promise<PaymentDetails> {
  const paymentDetails = await this.paymentDetailsRepository.findOne({
    where: { idPaymentDetails: id },
    relations: ['idUser', 'idEvent', 'payment'],
  });
  if (!paymentDetails) {
    throw new NotFoundException('Detalle de pago no encontrado');
  }


  const shouldSendEmail =
    !paymentDetails.checked && updateStatusDto.checked === true;

  paymentDetails.checked = updateStatusDto.checked;
  const updatedPaymentDetails = await this.paymentDetailsRepository.save(paymentDetails);

  if (shouldSendEmail) {
    const userEmail = updatedPaymentDetails.idUser?.email;
    const userId = updatedPaymentDetails.idUser?.id;
    if (!userEmail || !userId) {
      throw new BadRequestException('Usuario invalido para notificacion');
    }
    await this.mailService.sendTicketScannedConfirmation({
      userEmail,
      userName: updatedPaymentDetails.idUser.name,
      eventName: updatedPaymentDetails.idEvent.name,
      ticketQuantity: updatedPaymentDetails.ticketNum ?? 1,
      paymentId: updatedPaymentDetails.payment.idPayment,
      paymentDetailId: updatedPaymentDetails.idPaymentDetails,
      userId,
      eventId: updatedPaymentDetails.idEvent.idEvents,
      idTicket: updatedPaymentDetails.idTicket,
    });
  }

  return updatedPaymentDetails;
}
// ...existing code...

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ data: PaymentDetails[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const [data, total] = await this.paymentDetailsRepository.findAndCount({
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { idPaymentDetails: 'DESC' },
    });
    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: number): Promise<PaymentDetails> {
    const paymentDetails = await this.paymentDetailsRepository.findOne({
      where: { idPaymentDetails: id },
      relations: ['payment', 'idEvent', 'idUser', 'idConsumeDetails'],
    });
    if (!paymentDetails) {
      throw new NotFoundException('Detalle de pago no encontrado');
    }
    return paymentDetails;
  }
}
