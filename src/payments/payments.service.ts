import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDetailsService } from '../payment-details/payment-details.service';
import { ConsumeDetailsService } from '../consumeDetails/consumeDetails.service';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { MailerService } from '@nestjs-modules/mailer';
import * as QRCode from 'qrcode';

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

    private readonly dataSource: DataSource,

    private readonly mailerService: MailerService,

    private readonly paymentDetailsService: PaymentDetailsService,
    // private readonly consumeDetailsService: ConsumeDetailsService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const {
      idUser,
      idEvents,
      idConsumeDetails,
      noDocumento,
      date,
      // time,
      // totalBaseImponible,
      // impuestoBaseImponible,
      // totalExento,
      // descuento,
      // subtotalGeneral,
      // porcentajeIgtf,
      // totalIgtf,
      // impuesto,
      // porcentajeIva,
      // totalGeneral,
      // tasaDolar,
      // montoDolar,
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

    // Transacción para crear Payment y detalles
    return this.dataSource.transaction(async (manager) => {
      const payment = manager.create(Payment, {
        idUser: user,
        idEvents: event,
        idConsumeDetails: idConsumeDetails ? { idConsumeDetails } : undefined,
        noDocumento,
        date,
        // time,
        // totalBaseImponible,
        // impuestoBaseImponible,
        // totalExento,
        // descuento,
        // subtotalGeneral,
        // porcentajeIgtf,
        // totalIgtf,
        // impuesto,
        // porcentajeIva,
        // totalGeneral,
        // tasaDolar,
        // montoDolar,
        comprobante,
        banco,
        referencia,
        fechaTransferencia,
        status,
      } as any);

      const savedPayment = await manager.save(payment);

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
  const payment = await this.paymentsRepository.findOne({ where: { idPayment: id } });
  if (!payment) {
    throw new NotFoundException('Pago no encontrado');
  }
  payment.isDeleted = true;
  await this.paymentsRepository.save(payment);
  this.logger.log(`Pago ID ${id} marcado como eliminado`);
  }
}
