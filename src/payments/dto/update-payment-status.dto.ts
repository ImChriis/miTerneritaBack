import { IsString, IsEnum } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsEnum(['Aprobado', 'Pendiente', 'Rechazado'])
  readonly status: 'Aprobado' | 'Pendiente' | 'Rechazado';
}
