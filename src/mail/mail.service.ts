import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  /**
   * Envía un solo correo con todos los QRs de los tickets comprados.
   * @param paymentDetails Array de detalles de pago.
   */
  async sendTicketScannedConfirmation(paymentDetails: PaymentDetails[]) {
    if (!paymentDetails || paymentDetails.length === 0) return;

    const userEmail = paymentDetails[0].idUser.email;
    const userName = paymentDetails[0].idUser.name;
    const eventName = paymentDetails[0].idEvent.name;

    // Construye la lista de QRs
    const qrList = paymentDetails.map(detail => {
      const qrData = `PaymentDetailID:${detail.idPaymentDetails};PaymentID:${detail.payment.idPayment};User:${detail.idUser.id};Event:${detail.idEvent.idEvents};Ticket:${detail.idTicket.idTicket};Scanned:true`;
      const qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
      return {
        ticketName: detail.idTicket.name,
        paymentDetailId: detail.idPaymentDetails,
        qrCodeImage,
      };
    });

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: `¡Tus tickets para ${eventName}!`,
        template: 'tickets-multiple-confirmation', // Debes crear este template
        context: {
          userName: userName || 'usuario',
          eventName: eventName || 'evento',
          qrList,
          currentYear: new Date().getFullYear(),
        },
      });
      this.logger.log(`Correo de confirmación enviado a ${userEmail} con ${qrList.length} QRs`);
    } catch (error) {
      this.logger.error(`Error enviando correo de confirmación a ${userEmail}:`, error.stack);
    }
  }
}