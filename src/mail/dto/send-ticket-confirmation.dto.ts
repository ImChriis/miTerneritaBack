import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SendTicketConfirmationDto {
  @IsEmail()
  userEmail!: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  eventName?: string;

  @IsInt()
  @Min(1)
  ticketQuantity!: number;

  @IsInt()
  paymentId!: number;

  @IsInt()
  paymentDetailId!: number;

  @IsInt()
  userId!: number;

  @IsInt()
  eventId!: number;

  @IsInt()
  idTicket!: number;
}
