import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';
import { SalonService } from './salon.service';
import { UpdateZonasDto } from './dto/update-zonas.dto';
import { PorFueraDto } from './dto/por-fuera.dto';

@Controller('salon')
export class SalonController {
  constructor(private readonly salonService: SalonService) {}

  /** Público: mesas, puestos, escenario y barra. No cambia: se puede cachear. */
  @Get('plano')
  plano() {
    return this.salonService.plano();
  }

  /**
   * Zonas de las mesas y puestos tomados del evento (sin contar los del que
   * consulta). Publico: un visitante ve el mapa antes de iniciar sesion.
   */
  @Get(':idEvents')
  @UseGuards(OptionalJwtAuthGuard)
  estado(
    @Param('idEvents', ParseIntPipe) idEvents: number,
    @Request() req: Partial<AuthenticatedRequest>,
  ) {
    return this.salonService.estado(idEvents, req.user?.userId ?? 0);
  }

  @Put(':idEvents/zonas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  guardarZonas(
    @Param('idEvents', ParseIntPipe) idEvents: number,
    @Body() dto: UpdateZonasDto,
  ) {
    return this.salonService.guardarZonas(idEvents, dto.zonas);
  }

  /** Marca o libera puestos vendidos por fuera (VVIP sin pago en el sistema). */
  @Put(':idEvents/por-fuera')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  marcarPorFuera(
    @Param('idEvents', ParseIntPipe) idEvents: number,
    @Body() dto: PorFueraDto,
  ) {
    return this.salonService.marcarPorFuera(
      idEvents,
      dto.asientos,
      dto.vendido,
    );
  }
}
