import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { verificarEntrada } from './entrada-publica';

/**
 * GET /entrada/<firma>: la entrada (QR y datos del evento) sin iniciar sesión. Es
 * pública a propósito: el enlace firmado es lo que el personal comparte con el cliente.
 */
@Controller('entrada')
export class EntradaController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':firma')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Robots-Tag', 'noindex')
  ver(@Param('firma') firma: string) {
    const id = verificarEntrada(firma);
    if (!id) throw new NotFoundException('Entrada no encontrada');
    return this.paymentsService.entradaPublica(id);
  }
}
