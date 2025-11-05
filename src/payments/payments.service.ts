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
      idEvents,
      idConsumeDetails,
      noDocumento,
      date,
      time,
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
        time,
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
      });

      const savedPayment = await manager.save(payment);

      return savedPayment;
    });
  }

  async updateStatus(
    id: number,
    updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: id },
      relations: ['idUser', 'idEvents'],
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    if (payment.status === Number(updatePaymentStatusDto.status)) {
      throw new BadRequestException('El estado es el mismo que el actual');
    }
    const oldStatus = payment.status;
    payment.status = Number(updatePaymentStatusDto.status);
    const updatedPayment = await this.paymentsRepository.save(payment);
    // Enviar correo solo si el estado cambia a 'completed' (por ejemplo, status === 1)
    // Ajusta el valor según tu lógica de status
    if (oldStatus !== 1 && updatedPayment.status === 1) {
      this.logger.log(
        `Payment ID ${id} actualizado a completed. Enviando correo de confirmación...`,
      );
      await this.sendPaymentConfirmationEmail(
        updatedPayment.idUser.email,
        updatedPayment,
      );
    }
    return updatedPayment;
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

  private async sendPaymentConfirmationEmail(email: string, payment: Payment) {
    try {
      // Cargar detalles relacionados
      const paymentWithDetails = await this.paymentsRepository.findOne({
        where: { idPayment: payment.idPayment },
        relations: ['idUser', 'idEvents', 'consumeDetails', 'paymentDetails'],
      });
  const qrData = `PaymentID:${payment.idPayment};User:${payment.idUser?.id};Event:${payment.idEvents?.idEvents};Status:${payment.status}`;
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
            if (consume.idDrinks) {
              itemsHtml += `<li>Drink: ${consume.idDrinks.description} - Cantidad: ${consume.totalConsume}</li>`;
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
      where : { isDeleted: false },
      relations: ['idUser', 'idEvents', 'consumeDetails', 'paymentDetails'],
    });
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
