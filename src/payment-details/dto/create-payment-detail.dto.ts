import { IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreatePaymentDetailsDto {
  idPayment: number;
  idEvents: number;
  idUser: number;
  ticketNum?: number;
  precio: number;
  totalBase?: number;
  impuestoCalculado?: number;
  total?: number;
  tasaDolarEvento?: number;
  totalDolarEvento?: number;
  idTicket: number;
  idConsumeDetails?: number;
  status: number;
  checked?: boolean;
}