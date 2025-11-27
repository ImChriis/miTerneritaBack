import { IsInt, IsNumber, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export class CreatePaymentDetailsDto {
  @IsInt()
  idPayment: number;

  @IsInt()
  idEvents: number;

  @IsInt()
  idUser: number;

  @IsInt()
  ticketNum: number;

  @IsNumber()
  precio: number;

  @IsNumber()
  totalBase: number;

  @IsNumber()
  impuestoCalculado: number;

  @IsNumber()
  total: number;

  @IsNumber()
  tasaDolarEvento: number;

  @IsNumber()
  totalDolarEvento: number;

  @IsInt()
  idTicket: number;

  @IsInt()
  idConsumeDetails: number;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status: PaymentStatus;

  @IsBoolean()
  checked: boolean;

  @IsInt()
  quantity: number;
}