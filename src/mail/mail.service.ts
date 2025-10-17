import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  /**
   * Envía un correo de confirmación cuando el ticket ha sido escaneado.
   * @param paymentDetail Detalle del pago escaneado.
   */
  async sendTicketScannedConfirmation(paymentDetail: PaymentDetails) {
    const userEmail = paymentDetail.idUser.email;
    const userName = paymentDetail.idUser.name;
    const eventName = paymentDetail.idEvent.name;
    const ticketName = paymentDetail.idTicket.name;
    const paymentId = paymentDetail.payment.idPayment;
    const paymentDetailId = paymentDetail.idPaymentDetails;

    // Genera el QR usando el API externo (más simple y configurable)
    const qrData = `PaymentDetailID:${paymentDetailId};PaymentID:${paymentId};User:${paymentDetail.idUser.id};Event:${paymentDetail.idEvent.idEvents};Ticket:${paymentDetail.idTicket.idTicket};Scanned:true`;
    const qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: `¡Tu ticket para ${eventName} ha sido escaneado!`,
        template: 'ticket-scanned-confirmation',
        context: {
          userName: userName || 'usuario',
          eventName: eventName || 'evento',
          ticketName: ticketName || 'ticket',
          paymentId: paymentId || 'N/A',
          paymentDetailId: paymentDetailId || 'N/A',
          qrCodeImage,
          currentYear: new Date().getFullYear(),
        },
      });
      this.logger.log(`Correo de confirmación enviado a ${userEmail} para PaymentDetail ID: ${paymentDetailId}`);
    } catch (error) {
      this.logger.error(`Error enviando correo de confirmación a ${userEmail}:`, error.stack);
      // No relanzar el error para no bloquear la lógica de negocio
    }
  }
}