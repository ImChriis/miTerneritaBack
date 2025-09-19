import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ConsumeDetailsService } from './consumeDetails.service';
import { CreateConsumeDetailDto } from './dto/create-consumeDetail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('consume-details')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsumeDetailsController {
  constructor(private readonly consumeDetailsService: ConsumeDetailsService) {}

  // Solo admin puede crear detalles de consumo
  @Post()
  @Roles('admin')
  async create(@Body() createConsumeDetailDto: CreateConsumeDetailDto) {
    return this.consumeDetailsService.create(createConsumeDetailDto);
  }

  // Solo admin puede listar todos los detalles
  @Get()
  @Roles('admin')
  async findAll() {
    return this.consumeDetailsService.findAll();
  }

  // Listar detalles por pago (admin o usuario dueño del pago)
  @Get('payment/:idPayment')
  @Roles('admin', 'user')
  async findByPayment(@Param('idPayment', ParseIntPipe) idPayment: number) {
    return this.consumeDetailsService.findByPayment(idPayment);
  }

  // Solo admin puede eliminar detalle de consumo
  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.consumeDetailsService.remove(id);
    return { message: 'Detalle de consumo eliminado correctamente' };
  }
}
