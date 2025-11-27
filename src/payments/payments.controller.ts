import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Req,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('admin', 'user')
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: any,
  ) {
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Received DTO:', createPaymentDto);
    console.log('Files:', files);
    
    // Pasamos el archivo al servicio (si existe)
    const file = files && files.length > 0 ? files[0] : undefined;
    return this.paymentsService.create(createPaymentDto, file);
  }

  @Get()
  @Roles('admin')
  async findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'user')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  @Put(':id/status')
  @Roles('admin')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updateStatus(id, updatePaymentStatusDto);
  }

  @Delete(':id')
  async softDelete(@Param('id') id: number): Promise<void> {
    await this.paymentsService.softDelete(id);
  }
}
