import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';
import { PaymentsService } from './payments.service';
import { ReservarDto } from './dto/reservar.dto';

@Controller('reservas')
export class ReservasController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** Aparta las entradas mientras el cliente paga; reemplaza su apartado anterior. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'client')
  reservar(@Body() dto: ReservarDto, @Request() req: AuthenticatedRequest) {
    return this.paymentsService.reservar(
      dto.idEvents,
      req.user.userId,
      dto.cantidad,
    );
  }

  /** Público: { [idEvents]: personas comprando ahora }. */
  @Get('comprando')
  comprando() {
    return this.paymentsService.comprando();
  }
}
