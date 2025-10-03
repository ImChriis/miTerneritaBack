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
    private readonly consumeDetailsService: ConsumeDetailsService,
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
      where: { idEvents: createPaymentDto.idEvent },
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

    // --- Lógica de validación de límite de tickets ---
    const MAX_TICKETS_PER_USER = 10;
    let ticketsInCurrentPurchase = 0;
    for (const item of consumeItems) {
      if (item.detailType === 'ticket') {
        ticketsInCurrentPurchase += item.quantity;
      }
    }
    // TODO: Implement ticket limit validation using PaymentDetailsService if needed

    // Transacción para crear Payment y PaymentDetails
    return this.dataSource.transaction(async (manager) => {
      const payment = manager.create(Payment, {
        IdUser: user, // Asignar la instancia de User
        IdEvent: event, // Asignar la instancia de Event
        amountUSD,
        amountBS,
        paymentMethod,
        status,
      });

      const savedPayment = await manager.save(payment);

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
          (item.detailType === 'drink' && item.idDrink)
        ) {
          await this.consumeDetailsService.create({
            idPayment: savedPayment.idPayment,
            idFood: item.idFood,
            idDrink: item.idDrink,
            quantity: item.quantity,
          });
        }
      }
      // Eliminar o comentar esta línea si el correo se envía solo al actualizar el estado a 'completed'
      // await this.sendPaymentConfirmationEmail(user.email, savedPayment);
      return savedPayment;
    });
  }

  async updateStatus(
    id: number,
    updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: id },
      relations: ['IdUser', 'IdEvent'], // Asegúrate de cargar IdUser y IdEvent para el correo
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    if (payment.status === updatePaymentStatusDto.status) {
      throw new BadRequestException('El estado es el mismo que el actual');
    }
    const oldStatus = payment.status;
    payment.status = updatePaymentStatusDto.status;
    const updatedPayment = await this.paymentsRepository.save(payment);
    // Enviar correo solo si el estado cambia a 'completed'
    if (oldStatus !== 'completed' && updatedPayment.status === 'completed') {
      this.logger.log(
        `Payment ID ${id} actualizado a completed. Enviando correo de confirmación...`,
      );
      await this.sendPaymentConfirmationEmail(
        updatedPayment.IdUser.email,
        updatedPayment,
      );
    }
    return updatedPayment;
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: id },
      relations: ['IdUser', 'IdEvent', 'consumeDetails', 'paymentDetails'], // Ajustar a IdUser, IdEvent
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  private async sendPaymentConfirmationEmail(email: string, payment: Payment) {
    try {
      // Cargar detalles relacionados
      const paymentWithDetails = await this.paymentsRepository.findOne({
        where: { idPayment: payment.idPayment },
        relations: ['IdUser', 'IdEvent', 'consumeDetails.idFood', 'consumeDetails.idDrink', 'paymentDetails.idTicket'], // Ajustar a IdUser, IdEvent y cargar relaciones anidadas
      });
      const qrData = `PaymentID:${payment.idPayment};User:${payment.IdUser.id};Event:${payment.IdEvent.idEvents};AmountUSD:${payment.amountUSD};AmountBS:${payment.amountBS};Status:${payment.status}`;
      const qrCodeImage = await QRCode.toDataURL(qrData);

      // Construir detalles de ítems comprados
      let itemsHtml = '<ul>';
      if (paymentWithDetails) {
        if (
          paymentWithDetails.paymentDetails &&
          paymentWithDetails.paymentDetails.length > 0
        ) {
          for (const detail of paymentWithDetails.paymentDetails) {
            // Acceder a idTicket de la entidad PaymentDetails
            itemsHtml += `<li>Ticket: ${detail.idTicket?.name || 'N/A'} - Cantidad: ${
              (detail as any).quantity || 1
            } - Precio: $${(detail as any).price || 'N/A'}</li>`;
          }
        }
        if (
          paymentWithDetails.consumeDetails &&
          paymentWithDetails.consumeDetails.length > 0
        ) {
          for (const consume of paymentWithDetails.consumeDetails) {
            if (consume.idFood) {
              itemsHtml += `<li>Food: ${consume.idFood.description} - Cantidad: ${consume.totalConsume}</li>`;
            }
            if (consume.idDrink) {
              itemsHtml += `<li>Drink: ${consume.idDrink.description} - Cantidad: ${consume.totalConsume}</li>`;
            }
          }
        }
      }
      itemsHtml += '</ul>';

      await this.mailerService.sendMail({
        to: email,
        subject: 'Confirmación de Pago',
        html: `<p>Gracias por su pago. Aquí está su código QR:</p><img src="${qrCodeImage}" alt="QR Code" /><h3>Detalles de la compra:</h3>${itemsHtml}`,
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

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['IdUser', 'IdEvent', 'consumeDetails', 'paymentDetails'], // Ajustar a IdUser, IdEvent
    });
  }
}
