import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { ConsumeDetails } from '../consumeDetails/entities/consumeDetail.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDetailsService } from '../payment-details/payment-details.service';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

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

    // Validar y obtener entidades relacionadas
    const user = await this.usersRepository.findOneOrFail({ 
      where: { id: idUser } 
    }).catch(() => {
      throw new NotFoundException('Usuario no encontrado');
    });

    const event = await this.eventsRepository.findOneOrFail({ 
      where: { idEvents } 
    }).catch(() => {
      throw new NotFoundException('Evento no encontrado');
    });

    const ticket = await this.ticketsRepository.findOneOrFail({
      where: { idTicket, event: { idEvents } },
      relations: ['event'],
    }).catch(() => {
      throw new NotFoundException('Ticket no encontrado o no pertenece al evento especificado');
    });

    let consumeDetails: ConsumeDetails | undefined;
    if (idConsumeDetails) {
      const found = await this.consumeDetailsRepository.findOne({
        where: { idConsumeDetails },
      });
      if (!found) {
        throw new NotFoundException('ConsumeDetails no encontrado');
      }
      consumeDetails = found;
    }

    // Validar cantidad de tickets
    if (ticketNum < 1 || ticketNum > 10) {
      throw new NotFoundException('Solo puedes comprar entre 1 y 10 entradas');
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
        status: String(status),
      });

      const savedPayment = await manager.save(payment);

      // Calcular valores por ticket (dividir el total entre la cantidad de tickets)
      const precioPorTicket = ticket.price;
      const totalBasePorTicket = totalGeneral ? totalGeneral / ticketNum : precioPorTicket;
      const impuestoCalculadoPorTicket = 0; // Ajustar según lógica de negocio
      const totalPorTicket = precioPorTicket;
      const tasaDolarEvento = tasaDolar ?? 0;
      const totalDolarEventoPorTicket = montoDolar ? montoDolar / ticketNum : 0;

      // Crear PaymentDetails para cada ticket
      const paymentDetailsList: PaymentDetails[] = [];
      for (let i = 1; i <= ticketNum; i++) {
        const paymentDetail = manager.create(PaymentDetails, {
          payment: savedPayment,
          idEvent: event,
          idUser: user,
          ticketNum: i, // Número secuencial del ticket (1, 2, 3, ...)
          precio: precioPorTicket,
          totalBase: totalBasePorTicket,
          impuestoCalculado: impuestoCalculadoPorTicket,
          total: totalPorTicket,
          tasaDolarEvento: tasaDolarEvento,
          totalDolarEvento: totalDolarEventoPorTicket,
          idTicket: ticket,
          idConsumeDetails: consumeDetails,
          status: status === 1 ? 1 : 0, // 1 = aprobado, 0 = pendiente
          checked: false,
        });

        const savedPaymentDetail = await manager.save(paymentDetail);
        paymentDetailsList.push(savedPaymentDetail);
      }

      this.logger.log(
        `Payment ID ${savedPayment.idPayment} creado con ${ticketNum} PaymentDetails`,
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
  if (prevStatus === 'Pendiente' && updatePaymentStatusDto.status === 'Aprobado') {
    // Obtén datos de ConsumeDetails si existen
    const consumeDetails = payment.idConsumeDetails;

    // Construye el DTO para PaymentDetails
    const paymentDetailsDto = {
      idPayment: payment.idPayment,
      idEvents: payment.idEvents.idEvents,
      idUser: payment.idUser.id,
      ticketNum: 0, 
      precio: payment.totalGeneral ?? 0, // Usa totalGeneral como precio
      totalBase: payment.totalBaseImponible ?? 0,
      impuestoCalculado: payment.impuestoBaseImponible ?? 0,
      total: payment.totalGeneral ?? 0,
      tasaDolarEvento: payment.tasaDolar ?? 0,
      totalDolarEvento: payment.montoDolar ?? 0,
      idTicket: 0, // No hay relación directa, asigna 0
      idConsumeDetails: consumeDetails?.idConsumeDetails ?? 0,
      status: 1, // 1 = aprobado
      checked: false,
      quantity: 1, // No hay relación directa, asigna 1
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
