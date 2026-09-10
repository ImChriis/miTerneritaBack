import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MailService } from './mail.service';
import { SendTicketConfirmationDto } from './dto/send-ticket-confirmation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Este endpoint envía correo a un destinatario arbitrario usando el SMTP del
// proyecto. Sin autenticación era un relay abierto, así que queda restringido
// a admin. El envío del flujo normal ocurre en PaymentDetailsService.updateStatus.
@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  @Roles('admin')
  async sendMail(@Body() payload: SendTicketConfirmationDto) {
    return await this.mailService.sendMail(payload);
  }
}
