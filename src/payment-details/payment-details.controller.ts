import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Patch,
  Delete
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

  @Get()
  @Roles('admin')
  async findAll() {
    return this.paymentDetailsService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentDetailsService.findOne(id);
  }
  
  @Delete(':id')
  async softDelete(@Param('id') id: number): Promise<void> {
    await this.paymentDetailsService.softDelete(id);
  }
}
