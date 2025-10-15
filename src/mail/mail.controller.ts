import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send-ticket-confirmation')
  async sendTicketScannedConfirmation(
    @Body() paymentDetail: any // Use 'any' or define a DTO matching PaymentDetails
  ) {
      return await this.mailService.sendTicketScannedConfirmation(paymentDetail);
    
  }
}