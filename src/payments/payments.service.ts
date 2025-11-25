import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDetailsService } from '../payment-details/payment-details.service';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus } from '../common/enums/payment-status.enum';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,

    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,

    @InjectRepository(ConsumeDetails)
    private consumeDetailsRepository: Repository<ConsumeDetails>,

    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,

    @InjectRepository(PaymentDetails)
    private paymentDetailsRepository: Repository<PaymentDetails>,

    private readonly dataSource: DataSource,

    private readonly paymentDetailsService: PaymentDetailsService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const {
      idUser,
      idEvents,
      idConsumeDetails,
      idTicket,
      ticketNum,
      noDocumento,
      date,
      totalGeneral,
      tasaDolar,
      montoDolar,
      comprobante,
      banco,
      referencia,
      fechaTransferencia,
      status,
    } = createPaymentDto;

    // Validar arrays
    if (idTicket.length !== ticketNum.length) {
      throw new BadRequestException('La cantidad de tickets y cantidades no coinciden');
    }

    const totalTickets = ticketNum.reduce((a, b) => a + b, 0);

    // Validar cantidad de tickets
    if (totalTickets < 1 || totalTickets > 10) {
      throw new BadRequestException('Solo puedes comprar entre 1 y 10 entradas');
    }

    // Validar y obtener entidades relacionadas
    const user = await this.usersRepository.findOneBy({ id: idUser });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const event = await this.eventsRepository.findOneBy({ idEvents });
    if (!event) throw new NotFoundException('Evento no encontrado');

    const tickets = await this.ticketsRepository.find({
      where: { idTicket: In(idTicket), event: { idEvents } },
      relations: ['event'],
    });

    // Verificar que todos los tickets solicitados existan
    const foundTicketIds = tickets.map(t => t.idTicket);
    const missingTickets = idTicket.filter(id => !foundTicketIds.includes(id));
    if (missingTickets.length > 0) {
      throw new NotFoundException(`Tickets no encontrados o no pertenecen al evento: ${missingTickets.join(', ')}`);
    }

    const ticketsMap = new Map(tickets.map(t => [t.idTicket, t]));

    let consumeDetails: ConsumeDetails | undefined;
    if (idConsumeDetails) {
      const found = await this.consumeDetailsRepository.findOneBy({ idConsumeDetails });
      if (!found) throw new NotFoundException('ConsumeDetails no encontrado');
      consumeDetails = found;
    }

    // Transacción para crear Payment y PaymentDetails
    return this.dataSource.transaction(async (manager) => {
      // Crear Payment
      const payment = manager.create(Payment, {
        idUser: user,
        idEvents: event,
        idConsumeDetails: consumeDetails,
        noDocumento,
        date: new Date(date),
        totalGeneral,
        tasaDolar,
        montoDolar,
        comprobante,
        banco,
        referencia,
        fechaTransferencia: fechaTransferencia ? new Date(fechaTransferencia) : undefined,
        status: status,
      });

      const savedPayment = await manager.save(payment);

      let calculatedTotal = 0;
      for (let i = 0; i < idTicket.length; i++) {
        const tId = idTicket[i];
        const qty = ticketNum[i];
        const ticket = ticketsMap.get(tId);
        if (ticket) {
          calculatedTotal += ticket.price * qty;
        }
      }

      const ratio = (totalGeneral && calculatedTotal > 0) ? totalGeneral / calculatedTotal : 1;
      const tasaDolarEvento = tasaDolar ?? 0;
      const totalDolarEventoPorTicket = (montoDolar && totalTickets > 0) ? montoDolar / totalTickets : 0;

      const paymentDetailsToSave: PaymentDetails[] = [];
      let currentTicketSeq = 1;

      for (let i = 0; i < idTicket.length; i++) {
        const tId = idTicket[i];
        const qty = ticketNum[i];
        const ticket = ticketsMap.get(tId);

        if (!ticket) continue;

        const precioPorTicket = ticket.price;
        const totalBasePorTicket = precioPorTicket * ratio;
        const impuestoCalculadoPorTicket = 0; 
        const totalPorTicket = precioPorTicket; // Debería ser precioPorTicket * ratio si totalGeneral es diferente? Asumimos precio lista.

        for (let k = 0; k < qty; k++) {
          const paymentDetail = manager.create(PaymentDetails, {
            payment: savedPayment,
            idEvent: event,
            idUser: user,
            ticketNum: currentTicketSeq++, 
            precio: precioPorTicket,
            totalBase: totalBasePorTicket,
            impuestoCalculado: impuestoCalculadoPorTicket,
            total: totalPorTicket,
            tasaDolarEvento: tasaDolarEvento,
            totalDolarEvento: totalDolarEventoPorTicket,
            idTicket: ticket,
            idConsumeDetails: consumeDetails,
            status: status === PaymentStatus.APPROVED ? PaymentStatus.APPROVED : PaymentStatus.PENDING, 
            checked: false,
          });
          paymentDetailsToSave.push(paymentDetail);
        }
      }

      await manager.save(PaymentDetails, paymentDetailsToSave);

      this.logger.log(
        `Payment ID ${savedPayment.idPayment} creado con ${totalTickets} PaymentDetails`,
      );

      return savedPayment;
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: id, isDeleted: false },
      relations: ['idUser', 'idEvents', 'consumeDetails', 'paymentDetails'],
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where : { isDeleted: false },
      relations: ['idUser', 'idEvents', 'consumeDetails', 'paymentDetails'],
    });
  }

  async updateStatus(id: number, updatePaymentStatusDto: UpdatePaymentStatusDto): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: id, isDeleted: false },
      relations: ['idUser', 'idEvents', 'idConsumeDetails'],
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const prevStatus = payment.status;
    payment.status = updatePaymentStatusDto.status;

    const updatedPayment = await this.paymentsRepository.save(payment);

    // Si el status cambió de 'Pendiente' a 'Aprobado'
    if (prevStatus === PaymentStatus.PENDING && updatePaymentStatusDto.status === PaymentStatus.APPROVED) {
      // Obtén datos de ConsumeDetails si existen
      const consumeDetails = payment.idConsumeDetails;

      // Construye el DTO para PaymentDetails
      // NOTA: Esto crea un registro "resumen" o adicional. Verificar si es redundante con los creados en create().
      const paymentDetailsDto = {
        idPayment: payment.idPayment,
        idEvents: payment.idEvents.idEvents,
        idUser: payment.idUser.id,
        ticketNum: 0, 
        precio: payment.totalGeneral ?? 0, 
        totalBase: payment.totalBaseImponible ?? 0,
        impuestoCalculado: payment.impuestoBaseImponible ?? 0,
        total: payment.totalGeneral ?? 0,
        tasaDolarEvento: payment.tasaDolar ?? 0,
        totalDolarEvento: payment.montoDolar ?? 0,
        idTicket: 0, // No hay relación directa, asigna 0
        idConsumeDetails: consumeDetails?.idConsumeDetails ?? 0,
        status: PaymentStatus.APPROVED, 
        checked: false,
        quantity: 1, 
      };

      await this.paymentDetailsService.create(paymentDetailsDto);
      this.logger.log(`Detalles de pago insertados para el pago aprobado ID ${id}`);
    }

    return updatedPayment;
  }

  async softDelete(id: number): Promise<void> {
    const payment = await this.paymentsRepository.findOne({ 
      where: { idPayment: id, isDeleted: false } 
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    payment.isDeleted = true;
    await this.paymentsRepository.save(payment);
    this.logger.log(`Pago ID ${id} marcado como eliminado`);
  }
}
