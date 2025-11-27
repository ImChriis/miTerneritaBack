import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Payment } from '../payments/entities/payment.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  /**
   * Envía un solo correo con todos los QRs de los tickets comprados.
   * @param payment Entidad de pago con sus detalles cargados.
   */
  async sendTicketScannedConfirmation(payment: Payment) {
    this.logger.log(`Iniciando envío de correo para pago ${payment.idPayment}`);
    const paymentDetails = payment.paymentDetails;
    if (!paymentDetails || paymentDetails.length === 0) {
      this.logger.warn(`Pago ${payment.idPayment} no tiene detalles para enviar correo.`);
      return;
    }

    const userEmail = payment.idUser?.email;
    const userName = payment.idUser?.name;
    const eventName = payment.idEvents?.name;

    if (!userEmail) {
      this.logger.error(`Pago ${payment.idPayment}: Usuario no tiene email.`);
      return;
    }

    this.logger.log(`Preparando QRs para ${userEmail}, evento ${eventName}`);

    // Construye la lista de QRs
    const qrList = paymentDetails
      .filter(detail => detail.idTicket) // Filtrar detalles que tengan ticket válido
      .map(detail => {
      // Usamos payment.idPayment porque detail.payment podría no estar cargado si venimos desde payment
      const paymentId = payment.idPayment; 
      const qrData = `PaymentDetailID:${detail.idPaymentDetails};PaymentID:${paymentId};User:${detail.idUser.id};Event:${detail.idEvent.idEvents};Ticket:${detail.idTicket.idTicket};Scanned:true`;
      const qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
      return {
        ticketName: detail.idTicket.name,
        paymentDetailId: detail.idPaymentDetails,
        qrCodeImage,
      };
    });

    if (qrList.length === 0) {
      this.logger.warn(`Pago ${payment.idPayment}: No hay tickets válidos para generar QRs.`);
      return;
    }

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