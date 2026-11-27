import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
  @Roles('admin', 'client', 'user')
  reservar(@Body() dto: ReservarDto, @Request() req: AuthenticatedRequest) {
    // El tope de la web (10 por compra) no aplica al registro asistido del admin.
    if (
      req.user.role !== 'admin' &&
      (dto.cantidad > 10 || (dto.asientos?.length ?? 0) > 10)
    ) {
      throw new BadRequestException('Puedes apartar hasta 10 entradas');
    }
    return this.paymentsService.reservar(
      dto.idEvents,
      req.user.userId,
      dto.cantidad,
      dto.asientos ?? [],
    );
  }

  /** Suelta el apartado propio de un evento (el admin cancela un registro asistido). */
  @Delete(':idEvents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'client', 'user')
  async soltar(
    @Param('idEvents', ParseIntPipe) idEvents: number,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.paymentsService.soltarReserva(idEvents, req.user.userId);
    return { ok: true };
  }

  /** Público: ids de eventos agotados (SOLD OUT). Sin cantidades. */
  @Get('agotados')
  agotados() {
    return this.paymentsService.agotados();
  }

  /** Admin: cupo de cada evento (capacidad, vendidas, apartadas). */
  @Get('disponibles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  disponibles() {
    return this.paymentsService.disponibilidad();
  }

  /** Público: { [idEvents]: personas comprando ahora }. */
  @Get('comprando')
  comprando() {
    return this.paymentsService.comprando();
  }
}
