import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PaymentDetails } from './entities/paymentDetail.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Event } from '../events/entities/event.entity';
import { User } from '../users/entities/user.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
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

    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,

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
    const ticketsRepository = manager
      ? manager.getRepository(Ticket)
      : this.ticketsRepository;
    const paymentDetailsRepository = manager
      ? manager.getRepository(PaymentDetails)
      : this.paymentDetailsRepository;
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

    // Antes esto era una consulta SQL cruda contra la tabla `ticket`, aunque
    // ya existe la entidad Ticket con su repositorio.
    const ticket = await ticketsRepository.findOne({
      where: { idTicket },
    });
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
        isDeleted: false,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya existe un registro para este pago y ticket',
      );
    }

    // Usar el precio del DTO o el del ticket si no se proporciona. TypeORM
    // devuelve las columnas decimal como string, de ahi el Number().
    const finalPrice = price ?? Number(ticket.price);

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

async updateStatus(
  id: number,
  updateStatusDto: UpdatePaymentDetailsStatusDto,
): Promise<PaymentDetails> {
  const paymentDetails = await this.paymentDetailsRepository.findOne({
    where: { idPaymentDetails: id, isDeleted: false },
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
    await this.mailService.sendMail({
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

  /**
   * Total de PaymentDetails registrados el día de hoy (cantidad + monto).
   * paymentdetails no tiene columna de fecha propia, así que se usa la fecha
   * del payment relacionado (payment.date).
   */
  async getTotalToday(): Promise<{
    count: number;
    totalAmount: number;
  }> {
    const rows = await this.paymentDetailsRepository.manager.query(
      `SELECT
        COUNT(*) as count,
        COALESCE(SUM(pd.total), 0) as totalAmount
      FROM paymentdetails pd
      INNER JOIN payment p ON p.idPayment = pd.idPayment
      WHERE DATE(p.date) = CURDATE()
        AND pd.isDeleted = 0`,
    );
    const row = rows[0];
    return {
      count: Number(row.count),
      totalAmount: Number(row.totalAmount),
    };
  }

  /**
   * Total de PaymentDetails en general (cantidad + monto), sin filtro de fecha.
   */
  async getTotalGeneral(): Promise<{
    count: number;
    totalAmount: number;
  }> {
    const rows = await this.paymentDetailsRepository.manager.query(
      `SELECT
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as totalAmount
      FROM paymentdetails
      WHERE isDeleted = 0`,
    );
    const row = rows[0];
    return {
      count: Number(row.count),
      totalAmount: Number(row.totalAmount),
    };
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ data: PaymentDetails[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const [data, total] = await this.paymentDetailsRepository.findAndCount({
      where: { isDeleted: false },
      relations: ['payment', 'idEvent', 'idUser'],
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
      where: { idPaymentDetails: id, isDeleted: false },
      relations: ['payment', 'idEvent', 'idUser', 'idConsumeDetails'],
    });
    if (!paymentDetails) {
      throw new NotFoundException('Detalle de pago no encontrado');
    }
    return paymentDetails;
  }
}