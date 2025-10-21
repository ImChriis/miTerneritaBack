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
    private readonly consumeDetailsService: ConsumeDetailsService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const {
      idUser,
      idEvents,
      idConsumeDetails,
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
      consumeItems,
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

      const savedPayment = await manager.save(payment);

      if (consumeItems && Array.isArray(consumeItems)) {
        for (const item of consumeItems) {
          if (item.detailType === 'ticket' && item.idTicket) {
            await this.paymentDetailsService.create({
              idPayment: savedPayment.idPayment,
              idEvents: event.idEvents,
              idUser: user.id,
              idTicket: item.idTicket,
              precio: item.price,
              checked: false,
              status: 0,
            });
          } else if (
            (item.detailType === 'food' && item.idFood) ||
            (item.detailType === 'drink' && item.idDrinks)
          ) {
            await this.consumeDetailsService.create({
              idPayment: savedPayment.idPayment,
              idFood: item.idFood,
              idDrinks: item.idDrinks,
              foodAmount: item.foodAmount,
              drinksAmount: item.drinksAmount,
              totalConsume: item.totalConsume,  
            });
          }
        }
      }
      return savedPayment;
    });
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
