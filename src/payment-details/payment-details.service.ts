import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaymentDetails } from './entities/paymentDetail.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { Event } from '../events/entities/event.entity';
import { User } from '../users/entities/user.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { CreatePaymentDetailsDto } from './dto/create-payment-detail.dto';
import { UpdatePaymentDetailsStatusDto } from './dto/update-payment-detail-status.dto';
import { MailService } from '../mail/mail.service';
import { CodeService } from '../code/code.service';

/** Una linea de compra ya validada, con el precio sacado de la BD. */
export interface PaymentLine {
  ticket: Ticket;
  cantidad: number;
  precio: number;
  total: number;
}

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

    private readonly codeService: CodeService,

    private readonly dataSource: DataSource,
  ) {}

  async create(
    createPaymentDetailsDto: CreatePaymentDetailsDto,
    manager?: EntityManager,
  ): Promise<PaymentDetails> {
    const {
      idPayment,
      idEvents: idEvent,
      idUser,
      idTicket,
      idConsumeDetails,
      precio: price,
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
      totalBase: createPaymentDetailsDto.totalBase,
      impuestoCalculado: createPaymentDetailsDto.impuestoCalculado,
      total: createPaymentDetailsDto.total,
      tasaDolarEvento: createPaymentDetailsDto.tasaDolarEvento,
      totalDolarEvento: createPaymentDetailsDto.totalDolarEvento,
      idTicket: idTicket,
      idConsumeDetails: consumeDetails,
      status,
      checked,
    });

    const savedPaymentDetails =
      await paymentDetailsRepository.save(paymentDetails);
    return savedPaymentDetails;
  }

  /**
   * Crea las lineas de factura de un pago recien creado, dentro de la
   * transaccion de PaymentsService.create. Recibe las lineas ya validadas y
   * con el precio resuelto desde la tabla `ticket`.
   *
   * Sin impuestos por ahora: total = precio x cantidad, y los campos de
   * impuesto y tasa quedan vacios.
   */
  async createForPayment(
    manager: EntityManager,
    payment: Payment,
    lines: PaymentLine[],
  ): Promise<PaymentDetails[]> {
    const repository = manager.getRepository(PaymentDetails);

    const details = lines.map((line) =>
      repository.create({
        payment,
        idEvent: payment.idEvents,
        idUser: payment.idUser,
        idTicket: line.ticket.idTicket,
        ticketNum: line.cantidad,
        precio: line.precio,
        total: line.total,
        status: 0,
        checked: false,
        isDeleted: false,
      }),
    );

    return repository.save(details);
  }

  /**
   * Marca manual del admin. Mueve tambien el contador de la app de puerta:
   * marcar como escaneada gasta todas las entradas de la linea y desmarcar las
   * libera. Queda en el registro de escaneos (origen `manual`) para que
   * registro y contadores cuadren.
   */
  async updateStatus(
    id: number,
    updateStatusDto: UpdatePaymentDetailsStatusDto,
    idUserAdmin: number,
  ): Promise<PaymentDetails> {
    const { linea, enviarCorreo } = await this.dataSource.transaction(
      'READ COMMITTED',
      async (manager) => {
        const repo = manager.getRepository(PaymentDetails);
        // Se bloquea la linea: la app de puerta puede estar escaneando este
        // mismo pago en este momento.
        const bloqueada = await repo
          .createQueryBuilder('pd')
          .where('pd.idPaymentDetails = :id', { id })
          .andWhere('pd.isDeleted = 0')
          .setLock('pessimistic_write')
          .getOne();
        if (!bloqueada) {
          throw new NotFoundException('Detalle de pago no encontrado');
        }
        const linea = await repo.findOneOrFail({
          where: { idPaymentDetails: id },
          relations: ['idUser', 'idEvent', 'payment', 'ticket'],
        });

        const usadasAntes = linea.usadas;
        const enviarCorreo = !linea.checked && updateStatusDto.checked === true;
        linea.checked = updateStatusDto.checked;
        linea.usadas = updateStatusDto.checked ? (linea.ticketNum ?? 1) : 0;
        await repo.update(id, { checked: linea.checked, usadas: linea.usadas });
        await this.codeService.registrarCorreccionManual(
          manager,
          linea,
          usadasAntes,
          linea.usadas,
          idUserAdmin,
        );
        return { linea, enviarCorreo };
      },
    );

    if (enviarCorreo) {
      const userEmail = linea.idUser?.email;
      const userId = linea.idUser?.id;
      if (!userEmail || !userId) {
        throw new BadRequestException('Usuario invalido para notificacion');
      }
      await this.mailService.sendMail({
        userEmail,
        userName: linea.idUser.name,
        eventName: linea.idEvent.name,
        ticketQuantity: linea.ticketNum ?? 1,
        paymentId: linea.payment.idPayment,
        paymentDetailId: linea.idPaymentDetails,
        userId,
        eventId: linea.idEvent.idEvents,
        idTicket: linea.idTicket,
      });
    }

    return linea;
  }

  /**
   * Entradas vendidas hoy e importe. Mismo criterio que getTotalGeneral; la
   * fecha es la de compra del pago (paymentdetails no tiene fecha propia).
   */
  async getTotalToday(): Promise<{
    count: number;
    totalAmount: number;
  }> {
    const rows = await this.paymentDetailsRepository.manager.query(
      `SELECT
        COALESCE(SUM(COALESCE(pd.ticketNum, 1)), 0) as count,
        COALESCE(SUM(pd.total), 0) as totalAmount
      FROM paymentdetails pd
      INNER JOIN payment p ON p.idPayment = pd.idPayment
      WHERE p.status = ?
        AND p.isDeleted = 0
        AND pd.isDeleted = 0
        AND DATE(p.date) = CURDATE()`,
      [PaymentStatus.Aprobado],
    );
    const row = rows[0];
    return {
      count: Number(row.count),
      totalAmount: Number(row.totalAmount),
    };
  }

  /**
   * Entradas vendidas en total e importe, para el dashboard.
   *
   * - count suma las cantidades (ticketNum). Antes era COUNT(*), que contaba
   *   lineas: una compra de "General x3" sumaba 1.
   * - Solo cuentan los pagos Aprobados y no borrados: los pendientes aun no
   *   estan cobrados y los rechazados nunca se vendieron.
   */
  async getTotalGeneral(): Promise<{
    count: number;
    totalAmount: number;
  }> {
    const rows = await this.paymentDetailsRepository.manager.query(
      `SELECT
        COALESCE(SUM(COALESCE(pd.ticketNum, 1)), 0) as count,
        COALESCE(SUM(pd.total), 0) as totalAmount
      FROM paymentdetails pd
      INNER JOIN payment p ON p.idPayment = pd.idPayment
      WHERE p.status = ?
        AND p.isDeleted = 0
        AND pd.isDeleted = 0`,
      [PaymentStatus.Aprobado],
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
  ): Promise<{
    data: PaymentDetails[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
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
