import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Code } from './entities/code.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';
import { MailService } from '../mail/mail.service';

export interface ValidatedEntry {
  idPayment: number;
  buyerName: string;
  buyerEmail: string;
  eventName: string;
  eventDate: Date;
  ticketCount: number;
}

@Injectable()
export class CodeService {
  private readonly logger = new Logger(CodeService.name);

  constructor(
    @InjectRepository(Code)
    private readonly codeRepository: Repository<Code>,

    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,

    @InjectRepository(PaymentDetails)
    private readonly paymentDetailsRepository: Repository<PaymentDetails>,

    private readonly mailService: MailService,
  ) {}

  /**
   * Crea la entrada de un pago aprobado y la envia por correo.
   *
   * Es idempotente: si el pago ya tiene entrada se reutiliza, para que
   * reaprobar un pago no invalide el QR que el comprador ya recibio.
   */
  async issueForPayment(idPayment: number): Promise<Code> {
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment, isDeleted: false },
      relations: ['idUser', 'idEvents'],
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const existing = await this.codeRepository.findOne({
      where: { payment: { idPayment } },
      relations: ['payment'],
    });
    if (existing) {
      return existing;
    }

    // Token opaco: no lleva ningun dato del comprador ni del evento, asi que
    // fotografiar el QR de otra persona no revela nada.
    const token = crypto.randomBytes(24).toString('hex');

    const code = await this.codeRepository.save(
      this.codeRepository.create({ QR: token, payment }),
    );

    const email = payment.idUser?.email;
    if (email) {
      await this.mailService.sendEntryPass({
        userEmail: email,
        userName: payment.idUser?.name,
        eventName: payment.idEvents?.name,
        eventDate: payment.idEvents?.date,
        eventRoom: payment.idEvents?.room,
        token,
      });
    } else {
      this.logger.warn(
        `El pago ${idPayment} no tiene correo asociado; la entrada se creo pero no se envio.`,
      );
    }

    return code;
  }

  /**
   * Validacion en puerta. Marca como usados los detalles del pago y devuelve
   * los datos que necesita ver quien controla el acceso.
   */
  async validate(token: string): Promise<ValidatedEntry> {
    const code = await this.codeRepository.findOne({
      where: { QR: token },
      relations: ['payment', 'payment.idUser', 'payment.idEvents'],
    });
    if (!code) {
      throw new NotFoundException('Entrada no valida');
    }

    const payment = code.payment;

    const details = await this.paymentDetailsRepository.find({
      where: { payment: { idPayment: payment.idPayment }, isDeleted: false },
    });

    // Un pago sin detalles no da acceso a nada. Sin esta comprobacion el
    // codigo se podria escanear una y otra vez sin marcar nada como usado.
    if (details.length === 0) {
      throw new BadRequestException('Esta entrada no tiene tickets asociados');
    }

    if (details.every((detail) => detail.checked)) {
      throw new ConflictException('Esta entrada ya se uso');
    }

    for (const detail of details) {
      detail.checked = true;
    }
    await this.paymentDetailsRepository.save(details);

    return {
      idPayment: payment.idPayment,
      buyerName:
        `${payment.idUser?.name ?? ''} ${payment.idUser?.lastName ?? ''}`.trim(),
      buyerEmail: payment.idUser?.email ?? '',
      eventName: payment.idEvents?.name ?? '',
      eventDate: payment.idEvents?.date,
      ticketCount: details.reduce(
        (total, detail) => total + (detail.ticketNum ?? 1),
        0,
      ),
    };
  }
}
