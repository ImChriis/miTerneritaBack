import { IsString, IsEnum } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsEnum(['Aprovado', 'Pendiente', 'Rechazado'])
  readonly status: 'Aprovado' | 'Pendiente' | 'Rechazado';
}
