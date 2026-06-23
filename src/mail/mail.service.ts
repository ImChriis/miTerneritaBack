import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SendTicketConfirmationDto } from './dto/send-ticket-confirmation.dto';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  /**
   * Envía un correo de confirmación cuando el ticket ha sido escaneado.
   * @param paymentDetail Detalle del pago escaneado.
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

    // Genera el QR usando el API externo (más simple y configurable)
    const qrData = `PaymentDetailID:${paymentDetailId};PaymentID:${paymentId};User:${userId};Event:${eventId};Ticket:${idTicket};Scanned:true`;
    const qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    try {
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
          qrCodeImage,
          currentYear: new Date().getFullYear(),
        },
      });
      this.logger.log(
        `Correo de confirmación enviado a ${userEmail} para PaymentDetail ID: ${paymentDetailId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error enviando correo de confirmación a ${userEmail}:`,
        error.stack,
      );
      // No relanzar el error para no bloquear la lógica de negocio
    }
  }
}
