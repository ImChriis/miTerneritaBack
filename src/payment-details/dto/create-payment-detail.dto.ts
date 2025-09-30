import { IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreatePaymentDetailsDto {
  @IsOptional()
  @IsInt()
  readonly quantity?: number;

  @IsOptional()
  @Min(0)
  readonly price?: number;
  @IsInt()
  readonly idPayment: number;

  @IsInt()
  readonly idEvent: number;

  @IsInt()
  readonly idUser: number;

  @IsInt()
  readonly idTicket: number;

  @IsOptional()
  @IsInt()
  readonly idConsumeDetails?: number;

  @IsOptional()
  @IsBoolean()
  readonly scanned?: boolean;
}
