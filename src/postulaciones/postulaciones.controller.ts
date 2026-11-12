import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  assertComprobanteReal,
  cvUploadOptions,
  leerYBorrar,
} from '../common/uploads/comprobante-upload';
import { PostulacionesService } from './postulaciones.service';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { UpdateEstadoPostulacionDto } from './dto/update-estado-postulacion.dto';
import { UpdatePuestosDto } from './dto/update-puestos.dto';

@Controller('postulaciones')
export class PostulacionesController {
  constructor(private readonly postulacionesService: PostulacionesService) {}

  /**
   * Público: formulario "Trabaja con nosotros", multipart con el PDF opcional
   * en `cv` (500 KB máx.). 5 envíos cada 10 min por IP. Si algo falla, el
   * filtro global borra el archivo.
   */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 10 * 60 * 1000 } })
  @UseInterceptors(FileInterceptor('cv', cvUploadOptions()))
  async create(
    @UploadedFile() cv: Express.Multer.File | undefined,
    @Body() dto: CreatePostulacionDto,
  ) {
    if (cv) await assertComprobanteReal(cv);
    return this.postulacionesService.create(
      dto,
      cv?.filename,
      cv ? await leerYBorrar(cv) : undefined,
    );
  }

  /** Público: lista de puestos y los abiertos (el formulario solo muestra estos). */
  @Get('puestos')
  puestos() {
    return this.postulacionesService.puestos();
  }

  @Put('puestos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  setPuestos(@Body() dto: UpdatePuestosDto) {
    return this.postulacionesService.setPuestos(dto.abiertos);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.postulacionesService.findAll();
  }

  @Get(':id/cv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async cv(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const archivo = await this.postulacionesService.cv(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="cv-${id}.pdf"`,
      'Cache-Control': 'private, no-store',
    });
    return archivo.data
      ? new StreamableFile(archivo.data)
      : new StreamableFile(createReadStream(archivo.path!));
  }

  @Patch(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoPostulacionDto,
  ) {
    return this.postulacionesService.updateEstado(id, dto.estado);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.postulacionesService.remove(id);
    return { message: 'Postulación eliminada' };
  }
}
