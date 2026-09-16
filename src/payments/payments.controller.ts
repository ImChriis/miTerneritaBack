import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';
import {
  assertComprobanteReal,
  comprobanteUploadOptions,
} from '../common/uploads/comprobante-upload';

@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * multipart/form-data con el archivo en el campo `comprobante` (jpg, png,
   * webp o pdf). Los guards de la clase se ejecutan antes que el interceptor,
   * asi que una peticion sin token no llega a escribir nada en disco. Si la
   * compra falla despues, el filtro global borra el archivo.
   */
  @Post()
  @Roles('admin', 'client')
  @UseInterceptors(FileInterceptor('comprobante', comprobanteUploadOptions()))
  async create(
    @UploadedFile() comprobante: Express.Multer.File | undefined,
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!comprobante) {
      throw new BadRequestException('El comprobante es obligatorio');
    }
    await assertComprobanteReal(comprobante);

    return this.paymentsService.create(
      createPaymentDto,
      req.user,
      comprobante.filename,
    );
  }

  @Get()
  @Roles('admin')
  async findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'client')
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
  @Roles('admin', 'client')
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
    return new StreamableFile(createReadStream(archivo.path));
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
