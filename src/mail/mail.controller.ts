import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';
import { SendTicketConfirmationDto } from './dto/send-ticket-confirmation.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send-ticket-confirmation')
  async sendTicketScannedConfirmation(
    @Body() payload: SendTicketConfirmationDto,
  ) {
      return await this.mailService.sendTicketScannedConfirmation(payload);
  }
}