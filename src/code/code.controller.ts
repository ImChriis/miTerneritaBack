import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CodeService } from './code.service';
import { ValidateCodeDto } from './dto/validate-code.dto';
import { LookupCodeDto } from './dto/lookup-code.dto';
import { RedeemCodeDto } from './dto/redeem-code.dto';
import { ListScansQueryDto } from './dto/list-scans.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';

@Controller('code')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  /**
   * App de puerta, paso 1: estado del QR escaneado, sin gastar nada, con sus
   * ultimos escaneos. 200 aunque el QR este agotado (`agotada: true`).
   *
   * POST con el token en el cuerpo y no GET con el token en la URL: el token
   * da acceso al evento y las URLs acaban en los logs de proxies y servidores.
   */
  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'user')
  async lookup(
    @Body() dto: LookupCodeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.codeService.lookup(dto.token, dto.idEvents, req.user);
  }

  /**
   * App de puerta, paso 2: el personal confirma cuantas personas de cada tipo
   * pasan ahora. Todo o nada; 409 si se piden mas de las que quedan. Si la
   * app manda scanId, un reintento con el mismo responde lo mismo con
   * `repetido: true`.
   */
  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'user')
  async redeem(
    @Body() dto: RedeemCodeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.codeService.redeem(dto.token, dto.entradas, {
      idUser: req.user.userId,
      origen: 'app',
      scanId: dto.scanId,
      idEvents: dto.idEvents,
      puerta: dto.puerta,
    });
  }

  /**
   * Escaneo de un solo paso: deja pasar todas las entradas que queden en el
   * QR. Un QR agotado responde 409.
   */
  @Post('validate')
  @Roles('admin', 'user')
  async validate(
    @Body() dto: ValidateCodeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.codeService.validate(dto.token, {
      idUser: req.user.userId,
      origen: 'validate',
      scanId: dto.scanId,
      idEvents: dto.idEvents,
      puerta: dto.puerta,
    });
  }

  /**
   * Registro de escaneos. El personal ve solo los suyos (lista de "ultimos
   * escaneos" de la app); el admin, todos, filtrando por evento o pago.
   */
  @Get('scans')
  @Roles('admin', 'user')
  async listScans(
    @Query() query: ListScansQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.codeService.listScans(query, req.user);
  }

  /**
   * Deshace un escaneo y devuelve sus entradas. El personal, solo los suyos y
   * dentro de SCAN_UNDO_MINUTES; el admin, cualquiera.
   */
  @Post('scans/:idScan/undo')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'user')
  async undo(
    @Param('idScan', ParseIntPipe) idScan: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.codeService.undo(idScan, req.user);
  }

  /**
   * Reenvia la entrada de un pago ya aprobado. No genera un token nuevo.
   */
  @Post('payment/:idPayment/resend')
  @Roles('admin')
  async resend(@Param('idPayment', ParseIntPipe) idPayment: number) {
    await this.codeService.issueForPayment(idPayment);
    return { message: 'Entrada enviada correctamente' };
  }
}
