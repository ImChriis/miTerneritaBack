import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SendTicketConfirmationDto } from './dto/send-ticket-confirmation.dto';
import { generateQrPng, QR_CONTENT_ID } from './qr';
import { formatDateOnly } from '../common/format-date';

export interface SendEntryPassOptions {
  userEmail: string;
  userName?: string;
  eventName?: string;
  eventDate?: string;
  eventRoom?: string;
  /** Token opaco que va codificado en el QR. */
  token: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  /**
   * Envia la entrada del evento con su QR. Se manda al aprobar el pago; es el
   * codigo que se escanea en puerta.
   */
  async sendEntryPass(options: SendEntryPassOptions) {
    const { userEmail, userName, eventName, eventDate, eventRoom, token } =
      options;

    try {
      const qr = await generateQrPng(token);

      await this.mailerService.sendMail({
        to: userEmail,
        subject: `Tu entrada para ${eventName ?? 'el evento'}`,
        template: 'entry-pass',
        context: {
          userName: userName || 'usuario',
          eventName: eventName || 'el evento',
          eventDate: formatDateOnly(eventDate),
          eventRoom: eventRoom || null,
          qrCodeImage: `cid:${QR_CONTENT_ID}`,
          currentYear: new Date().getFullYear(),
        },
        attachments: [
          { filename: 'entrada.png', content: qr, cid: QR_CONTENT_ID },
        ],
      });

      this.logger.log(`Entrada enviada a ${userEmail}`);
    } catch (error: unknown) {
      this.logger.error(
        `Error enviando la entrada a ${userEmail}`,
        error instanceof Error ? error.stack : String(error),
      );
      // No se relanza: que falle el correo no debe tumbar la aprobacion del
      // pago. La entrada queda guardada y se puede reenviar.
    }
  }

  /**
   * Confirmacion de que la entrada ya fue escaneada. Es un justificante, no
   * sirve para entrar.
   */
  async sendMail(payload: SendTicketConfirmationDto) {
    const {
      userEmail,
      userName,
      eventName,
      ticketQuantity,
      paymentId,
      paymentDetailId,
      userId,
      eventId,
      idTicket,
    } = payload;

    const qrData = `PaymentDetailID:${paymentDetailId};PaymentID:${paymentId};User:${userId};Event:${eventId};Ticket:${idTicket};Scanned:true`;

    try {
      const qr = await generateQrPng(qrData);

      await this.mailerService.sendMail({
        to: userEmail,
        subject: `¡Tu ticket para ${eventName} ha sido escaneado!`,
        template: 'ticket-scanned-confirmation',
        context: {
          userName: userName || 'usuario',
          eventName: eventName || 'evento',
          ticketQuantity,
          paymentId: paymentId || 'N/A',
          paymentDetailId: paymentDetailId || 'N/A',
          qrCodeImage: `cid:${QR_CONTENT_ID}`,
          currentYear: new Date().getFullYear(),
        },
        attachments: [
          { filename: 'comprobante.png', content: qr, cid: QR_CONTENT_ID },
        ],
      });

      this.logger.log(
        `Correo de confirmación enviado a ${userEmail} para PaymentDetail ID: ${paymentDetailId}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Error enviando correo de confirmación a ${userEmail}:`,
        error instanceof Error ? error.stack : String(error),
      );
      // No relanzar el error para no bloquear la lógica de negocio
    }
  }
}
