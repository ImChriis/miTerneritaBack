import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * Este DTO no tenia ningun decorador. Como el ValidationPipe global usa
 * whitelist + forbidNonWhitelisted, class-validator trataba todas las
 * propiedades como no permitidas y el endpoint devolvia 400 siempre.
 */
export class CreatePaymentDetailsDto {
  @IsInt()
  @Min(1)
  readonly idPayment: number;

  @IsInt()
  @Min(1)
  readonly idEvents: number;

  @IsInt()
  @Min(1)
  readonly idUser: number;

  @IsInt()
  @Min(1)
  readonly idTicket: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  readonly ticketNum?: number;

  /** Si no se envia, se toma el precio del ticket. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly precio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly totalBase?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly impuestoCalculado?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly total?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly tasaDolarEvento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly totalDolarEvento?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  readonly idConsumeDetails?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly status?: number;

  @IsOptional()
  @IsBoolean()
  readonly checked?: boolean;
}
