import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { memoryStorage } from 'multer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus } from './enums/payment-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';
import {
  assertComprobanteReal,
  comprobanteUploadOptions,
  leerComprobante,
} from '../common/uploads/comprobante-upload';

class AprobarLoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  readonly ids: number[];
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * multipart/form-data con el archivo opcional en el campo `comprobante`
   * (jpg, png, webp o pdf). Los guards de la clase se ejecutan antes que el interceptor,
   * asi que una peticion sin token no llega a escribir nada en disco. Si la
   * compra falla despues, el filtro global borra el archivo.
   */
  /** Reporte de ventas del evento (entradas y consumo cobrados). */
  @Get('reporte/:idEvents')
  @Roles('admin')
  reporte(@Param('idEvents', ParseIntPipe) idEvents: number) {
    return this.paymentsService.reporte(idEvents);
  }

  /**
   * Conciliacion bancaria: el estado de cuenta (xlsx o csv) se cruza con los
   * pagos pendientes. Solo propone; aprobar es POST /payment/aprobar-lote.
   */
  @Post('conciliar')
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  conciliar(@UploadedFile() archivo: Express.Multer.File | undefined) {
    if (!archivo) throw new BadRequestException('Adjunta el estado de cuenta');
    return this.paymentsService.conciliar(archivo.buffer, archivo.originalname);
  }

  @Post('aprobar-lote')
  @Roles('admin')
  aprobarLote(@Body() dto: AprobarLoteDto) {
    return this.paymentsService.aprobarLote(dto.ids);
  }

  /** Excel de pagos. Filtros opcionales: desde/hasta (AAAA-MM-DD), idEvents, status. */
  @Get('exportar')
  @Roles('admin')
  async exportar(
    @Query('desde') desde: string | undefined,
    @Query('hasta') hasta: string | undefined,
    @Query('idEvents') idEvents: string | undefined,
    @Query('status') status: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    for (const f of [desde, hasta]) {
      if (f && !FECHA.test(f)) {
        throw new BadRequestException('Fechas en formato AAAA-MM-DD');
      }
    }
    if (
      status &&
      !Object.values(PaymentStatus).includes(status as PaymentStatus)
    ) {
      throw new BadRequestException('Estado no válido');
    }
    const data = await this.paymentsService.exportar({
      desde,
      hasta,
      idEvents: idEvents ? Number(idEvents) || undefined : undefined,
      status: status as PaymentStatus | undefined,
    });
    const nombre = `pagos${desde ? '-' + desde : ''}${hasta ? '_' + hasta : ''}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(data);
  }

  @Post()
  @Roles('admin', 'client', 'user')
  @UseInterceptors(FileInterceptor('comprobante', comprobanteUploadOptions()))
  async create(
    @UploadedFile() comprobante: Express.Multer.File | undefined,
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Un cliente siempre paga por transferencia, pago movil o Zelle: necesita
    // comprobante. Solo el admin registra pagos en efectivo sin el.
    let comprobanteData: Buffer | undefined;
    let comprobanteNombre: string | undefined;
    if (comprobante) {
      await assertComprobanteReal(comprobante);
      ({ data: comprobanteData, filename: comprobanteNombre } =
        await leerComprobante(comprobante));
    } else if (req.user.role !== 'admin') {
      throw new BadRequestException('Adjunta el comprobante de pago');
    }

    const payment = await this.paymentsService.create(
      createPaymentDto,
      req.user,
      comprobanteNombre,
      comprobanteData,
    );

    // Efectivo registrado por el admin: el dinero ya está en mano, se aprueba de una.
    // Por updateStatus: emite el QR, envía el correo y marca la revisión como siempre.
    if (!comprobante && req.user.role === 'admin') {
      return this.paymentsService.updateStatus(payment.idPayment, {
        status: PaymentStatus.Aprobado,
      });
    }
    return payment;
  }

  /** Enlace público de la entrada para compartirla (WhatsApp, impresa). */
  @Get(':id/enlace-entrada')
  @Roles('admin')
  enlaceEntrada(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.enlaceEntrada(id);
  }

  @Get()
  @Roles('admin')
  async findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'client', 'user')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    // Un usuario con rol 'user' solo puede consultar sus propios pagos.
    return this.paymentsService.findOneForRequester(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  /**
   * Devuelve el archivo del comprobante. Solo el admin o el dueno del pago.
   *
   * Pide el token como cualquier otra ruta, asi que el front no puede usarla
   * directamente en un <img src>: tiene que descargarla con fetch y la
   * cabecera Authorization, y mostrarla con URL.createObjectURL().
   */
  @Get(':id/comprobante')
  @Roles('admin', 'client', 'user')
  async getComprobante(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const archivo = await this.paymentsService.getComprobante(id, req.user);
    res.set({
      'Content-Type': archivo.mimeType,
      'Content-Disposition': `inline; filename="comprobante-${id}${archivo.extension}"`,
      // Contiene datos bancarios: que no lo guarde ninguna cache intermedia.
      'Cache-Control': 'private, no-store',
    });
    return archivo.data
      ? new StreamableFile(archivo.data)
      : new StreamableFile(createReadStream(archivo.path!));
  }

  /**
   * Aprobar o rechazar un pago. UpdatePaymentStatusDto existia desde el
   * principio pero no lo usaba ningun endpoint: no habia forma de cambiar el
   * estado de un pago una vez creado.
   */
  @Patch(':id/status')
  @Roles('admin')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.paymentsService.remove(id);
    return { message: 'Pago eliminado correctamente' };
  }
}
