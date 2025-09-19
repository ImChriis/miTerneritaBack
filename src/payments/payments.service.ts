import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentDetails } from './entities/paymentDetails.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { MailerService } from '@nestjs-modules/mailer';
import * as QRCode from 'qrcode';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,

    @InjectRepository(PaymentDetails)
    private paymentDetailsRepository: Repository<PaymentDetails>,

    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,

    private readonly dataSource: DataSource,

    private readonly mailerService: MailerService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const {
      idUser,
      idEvent,
      amountUSD,
      amountBS,
      paymentMethod,
      status,
      consumeItems,
    } = createPaymentDto;

    const user = await this.usersRepository.findOne({ where: { id: idUser } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const event = await this.eventsRepository.findOne({
      where: { id: idEvent },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    if (paymentMethod === 'USD' && amountUSD <= 0) {
      throw new BadRequestException('El monto en USD debe ser mayor que cero');
    }

    if (paymentMethod === 'BS' && amountBS <= 0) {
      throw new BadRequestException('El monto en BS debe ser mayor que cero');
    }

    // Transacción para crear Payment y PaymentDetails
    return this.dataSource.transaction(async (manager) => {
      const payment = manager.create(Payment, {
        user,
        event,
        amountUSD,
        amountBS,
        paymentMethod,
        status,
      });

      const savedPayment = await manager.save(payment);

      for (const item of consumeItems) {
        const paymentDetail = manager.create(PaymentDetails, {
          payment: savedPayment,
          detailType: item.detailType,
          quantity: item.quantity,
          price: item.price,
        });
        await manager.save(paymentDetail);
      }

      // Generar QR y enviar correo
      await this.sendPaymentConfirmationEmail(user.email, savedPayment);

      return savedPayment;
    });
  }

  async updateStatus(
    id: number,
    updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status === updatePaymentStatusDto.status) {
      throw new BadRequestException('El estado es el mismo que el actual');
    }

    payment.status = updatePaymentStatusDto.status;
    return this.paymentsRepository.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['user', 'event', 'consumeDetails', 'paymentDetails'],
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['user', 'event', 'consumeDetails', 'paymentDetails'],
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  private async sendPaymentConfirmationEmail(email: string, payment: Payment) {
    try {
      const qrData = `PaymentID:${payment.id};User :${payment.user.id};Event:${payment.event.id};AmountUSD:${payment.amountUSD};AmountBS:${payment.amountBS};Status:${payment.status}`;
      const qrCodeImage = await QRCode.toDataURL(qrData);

      await this.mailerService.sendMail({
        to: email,
        subject: 'Confirmación de Pago',
        html: `<p>Gracias por su pago. Aquí está su código QR:</p><img src="${qrCodeImage}" alt="QR Code" />`,
      });

      this.logger.log(`Correo de confirmación enviado a ${email}`);
    } catch (error) {
      this.logger.error('Error enviando correo de confirmación', error);
      // No lanzar error para no afectar flujo principal
    }
  }

  // Método para actualizar tasa de cambio (solo admin)
  async updateExchangeRate(newRate: number): Promise<void> {
    // Aquí se podría guardar en una tabla o configuración
    // Por simplicidad, asumimos que se guarda en una tabla llamada ExchangeRate
    // Implementar según necesidad
    this.logger.log(`Tasa de cambio actualizada a ${newRate}`);
  }
}
