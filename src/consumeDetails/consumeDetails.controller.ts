import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ConsumeDetailsService } from './consumeDetails.service';
import { CreateConsumeDetailDto } from './dto/create-consumeDetail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';

@Controller('consume-details')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsumeDetailsController {
  constructor(private readonly consumeDetailsService: ConsumeDetailsService) {}

  @Post()
  @Roles('admin')
  async create(@Body() createConsumeDetailDto: CreateConsumeDetailDto) {
    return this.consumeDetailsService.create(createConsumeDetailDto);
  }

  @Get()
  @Roles('admin')
  async findAll() {
    return this.consumeDetailsService.findAll();
  }

  @Get('payment/:idPayment')
  @Roles('admin', 'client')
  async findByPayment(
    @Param('idPayment', ParseIntPipe) idPayment: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.consumeDetailsService.findByPayment(idPayment, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.consumeDetailsService.remove(id);
    return { message: 'Detalle de consumo eliminado correctamente' };
  }
}
