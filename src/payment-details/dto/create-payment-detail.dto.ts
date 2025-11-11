import { IsInt, IsNumber, IsBoolean } from 'class-validator';

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

  @IsInt()
  status: number;

  @IsBoolean()
  checked: boolean;

  @IsInt()
  quantity: number;
}