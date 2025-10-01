import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as QRCode from 'qrcode'; // Necesitarás instalar 'qrcode'
import { PaymentDetails } from '../payment-details/entities/paymentDetail.entity'; // Importa la entidad

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  // Método genérico para enviar correos (ya lo tenías, lo mantengo)
  async sendEmail(to: string, subject: string, text: string, html?: string) {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email enviado a ${to} con asunto: ${subject}`);
    } catch (error) {
      this.logger.error(`Error enviando email a ${to}:`, error.stack);
      // Puedes decidir si relanzar el error o solo loguearlo
      // throw new Error('Fallo al enviar email'); 
    }
  }

  // Nuevo método para enviar confirmación de ticket escaneado
  async sendTicketScannedConfirmation(paymentDetail: PaymentDetails) {
    const userEmail = paymentDetail.user.email;
    const userName = paymentDetail.user.name;
    const eventName = paymentDetail.event.name;
    const ticketName = paymentDetail.ticket.name;
    const paymentId = paymentDetail.payment.idPayment;
    const paymentDetailId = paymentDetail.id;

    // Generar QR Code con información relevante del ticket escaneado
    const qrData = `PaymentDetailID:${paymentDetailId};PaymentID:${paymentId};User:${paymentDetail.user.id};Event:${paymentDetail.event.idEvents};Ticket:${paymentDetail.ticket.idTicket};Scanned:true`;
    let qrCodeImage: string;
    try {
      qrCodeImage = await QRCode.toDataURL(qrData);
    } catch (qrError) {
      this.logger.error('Error generando QR Code para confirmación de escaneo:', qrError.stack);
      qrCodeImage = ''; // En caso de error, no incluir QR
    }

    const subject = `¡Tu ticket para ${eventName} ha sido escaneado!`;
    const templateName = 'ticket-scanned-confirmation'; // Nombre de la plantilla Handlebars

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: subject,
        template: templateName,
        context: {
          userName: userName,
          eventName: eventName,
          ticketName: ticketName,
          paymentId: paymentId,
          paymentDetailId: paymentDetailId,
          qrCodeImage: qrCodeImage, // Pasar la imagen QR a la plantilla
          // Puedes añadir más datos si los necesitas en la plantilla
        },
      });
      this.logger.log(`Correo de confirmación de ticket escaneado enviado a ${userEmail} para PaymentDetail ID: ${paymentDetailId}`);
    } catch (error) {
      this.logger.error(`Error enviando correo de confirmación de escaneo a ${userEmail}:`, error.stack);
      // No relanzar el error para no bloquear la actualización del estado del ticket
    }
  }
}
