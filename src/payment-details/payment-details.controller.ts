import {
  Controller,
  DefaultValuePipe,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { PaymentDetailsService } from './payment-details.service';
import { CreatePaymentDetailsDto } from './dto/create-payment-detail.dto';
import { UpdatePaymentDetailsStatusDto } from './dto/update-payment-detail-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payment-details')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentDetailsController {
  constructor(private readonly paymentDetailsService: PaymentDetailsService) {}

  @Post()
  @Roles('admin')
  async create(@Body() createPaymentDetailsDto: CreatePaymentDetailsDto) {
    return this.paymentDetailsService.create(createPaymentDetailsDto);
  }

  @Patch(':id/status')
  @Roles('admin')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdatePaymentDetailsStatusDto,
  ) {
    return this.paymentDetailsService.updateStatus(id, updateStatusDto);
  }

  // El servicio ya paginaba, pero el controlador no exponia los parametros,
  // asi que siempre se devolvian los 20 primeros.
  @Get()
  @Roles('admin')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.paymentDetailsService.findAll(page, limit);
  }

  @Get('totals/today')
  @Roles('admin')
  async getTotalToday() {
    return this.paymentDetailsService.getTotalToday();
  }

  @Get('totals/general')
  @Roles('admin')
  async getTotalGeneral() {
    return this.paymentDetailsService.getTotalGeneral();
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentDetailsService.findOne(id);
  }
}
