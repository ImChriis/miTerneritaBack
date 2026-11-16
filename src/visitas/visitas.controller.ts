import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VisitasService } from './visitas.service';
import { RegistrarVisitaDto } from './dto/registrar-visita.dto';
import { ResumenVisitasDto } from './dto/resumen-visitas.dto';

@Controller('visitas')
export class VisitasController {
  constructor(private readonly visitasService: VisitasService) {}

  /**
   * Publico: el sitio avisa cada navegacion y un latido por minuto. Anonimo
   * (sin IP ni usuario). Limite holgado: en un local muchos comparten IP.
   */
  @Post()
  @HttpCode(204)
  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  registrar(
    @Body() dto: RegistrarVisitaDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.visitasService.registrar(dto, userAgent);
  }

  @Get('resumen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  resumen(@Query() query: ResumenVisitasDto) {
    return this.visitasService.resumen(query.dias);
  }

  @Get('activas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  activas() {
    return this.visitasService.activas();
  }
}
